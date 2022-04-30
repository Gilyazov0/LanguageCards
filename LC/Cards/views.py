from django.urls import reverse
from xmlrpc.client import ResponseError
from django.shortcuts import get_object_or_404, render
from django.http import HttpResponseRedirect, JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from matplotlib.style import context

from .models import Card, Tag, FA_value, Face_attribute
from random import shuffle
import json
from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.models import User
from .forms import *

 

def login_request(request):
    context = {}
    if request.method == "POST":
        username = request.POST['username']
        password = request.POST['psw']
        user = authenticate(username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect('Cards:index')
        else:
            context['message'] = "Invalid username or password."
            return render(request, 'Cards/user_login.html', context)
    else:
        return render(request, 'Cards/user_login.html', context)


def logout_request(request):
    logout(request)
    return redirect('Cards:index')


def registration_request(request):
    context = {}
    if request.method == 'GET':
        return render(request, 'Cards/registration.html', context)
    elif request.method == 'POST':
        # Check if user exists
        username = request.POST['username']
        password = request.POST['psw']
        first_name = request.POST['firstname']
        last_name = request.POST['lastname']
        user_exist = False
        try:
            User.objects.get(username=username)
            user_exist = True
        except:
            pass
        if not user_exist:
            user = User.objects.create_user(username=username, first_name=first_name, last_name=last_name,
                                            password=password)
            login(request, user)
            return redirect("Cards:index")
        else:
            context['message'] = "User already exists."
            return render(request, 'Cards/registration.html', context)


def create_tag(request):
    if request.method == "POST":
        user_tag_name = request.POST['user_tag']
        tag = Tag()
        tag.user = request.user
        tag.name = user_tag_name
        try:
            tag.save()
        except:
            pass    
        return HttpResponseRedirect(reverse('Cards:profile'))


def delete_tag(request):
    if request.method == "POST":
        tag_id = int(request.POST['tag_id'])
        tag = get_object_or_404(Tag, pk=tag_id)
        tag.delete()
        return HttpResponseRedirect(reverse('Cards:profile'))


def profile(request):
    if not request.user.is_authenticated:
        return ResponseError('User is not authenticated')
    context = {}    
    context['user_tags'] = Tag.objects.filter(user=request.user)

    return render(request, 'Cards/profile.html', context)


def index(request):
    return render(request, "Cards/index.html",)


def game(request):    
    return render(request, "Cards/game.html")

# filtr = {'keyword': keyword, 'FA': FA}
def filter_cards_by_keyword(filter):  
     
    fa = filter.get('FA')
    if fa and fa !="Any":
        return  Card.objects.filter(FAs__value__icontains=filter.get('keyword'), FAs__FA__name=fa).distinct() 
    else:
        return Card.objects.filter(FAs__value__icontains=filter.get('keyword')).distinct()   
   

#filter:[{'include':[tag_id, ..], 'exclude':[tag_id, ...]} ...]
def filter_cards_by_tags(filter):

    if not filter:
        return Card.objects.all()

    cards_result = None
    for tags_pair in filter:
        
        cards = Card.objects.all()
        tags_include = tags_pair.get("include", [])
        tags_exclude = tags_pair.get("exclude", [])
        

        for tag in tags_include:
            cards = cards.filter(tags__id=tag)
        for tag in tags_exclude:
            cards = cards.exclude(tags__id=tag)
        if cards_result == None:
            cards_result = cards
        else:
            cards_result = cards_result.union(cards)
    return cards_result


def filter_cards(filters):
    cards = Card.objects.all()
    if filters.get('tag_filter'):
         cards = cards.intersection(filter_cards_by_tags(filters.get('tag_filter')))
   
   # {'search': {'keyword': keyword, 'FA': FA}
    if filters.get('search'):
         cards = cards.intersection(filter_cards_by_keyword(filters.get('search')))
    return cards

@csrf_exempt
def get_cards(request):
    data = json.loads(request.body) #{tag_filter:[{'include':[tag_id, ..], 'exclude':[tag_id, ...]} ...]}
    cards = filter_cards(data)   
        
    result = get_card_set_data(cards, request.user)  
    shuffle(result['cards']['order'])

    return JsonResponse(result, safe=False)

def get_card_set_data(cards, user):
    
    cards_dict = {}
    cards_order = []
    for card in cards:        
        cards_dict[card.id] = card.serialize(user)
        cards_order.append(card.id)
    
    result = {}
    result['cards'] = {'cards': cards_dict, 'order': cards_order}
    result['tags'] = get_tags_dict(user)

    return result

#     return JsonResponse(result, safe=False)

def get_tags_dict(user,add_common_tags = True):
    result = {}
    if add_common_tags:
        tags = Tag.objects.filter(user=None)
        result['tags'] = [tag.serialize() for tag in tags]
    if user.is_authenticated:
        result['user_tags'] = [tag.serialize() for tag in Tag.objects.filter(user=user)]
    else:
        result['user_tags'] = []
    return result

@csrf_exempt
def get_metadata(request):
# return all metadata (data we need to setup a game) of the game. currently tags and FAs    
    result = get_tags_dict(request.user)  
    result['FAs'] = [FA.serialize() for FA in Face_attribute.objects.all()]
    
    return JsonResponse(result, safe=False)

@csrf_exempt
def set_card_tag(request):
    if request.method == "POST":
        data = json.loads(request.body)
        tag_id = int(data['tag_id'])
        card_id = int(data['card_id'])
        card = get_object_or_404(Card,pk = card_id)
        tag = get_object_or_404(Tag,pk = tag_id)
        if not card.tags.filter(id = tag_id):
            card.tags.add(tag)            
            card.save()
            
    return JsonResponse(card.serialize(request.user), safe=False)

@csrf_exempt
def delete_card_tag(request):
    if request.method == "POST":
        data = json.loads(request.body)
        tag_id = int(data['tag_id'])
        card_id = int(data['card_id'])
        card = get_object_or_404(Card,pk = card_id)
        tag = get_object_or_404(Tag,pk = tag_id)
        if card.tags.filter(id = tag_id):
            card.tags.remove(tag)
            card.save()
    return JsonResponse(card.serialize(request.user), safe=False)


def card_profile(request, card_id):
    message =''
    card = get_object_or_404(Card,pk = card_id)
    if request.method == "POST":
        if request.POST['action'] == 'Save':
            form = CardForm(request.POST, user = request.user,instance=card)
            if form.is_valid():
                form.save()
                message = 'Card succesfully saved'
        if request.POST['action'] == 'Delete':
            card.delete()
            return HttpResponse("Card succesfully deleted")
    else:
        form = CardForm(instance=card, user =request.user)    
    context = {}
    context['tags_data'] = json.dumps(get_tags_dict(request.user,False))
    context['form'] = form 
    context['card_id'] = card_id 
    context['card_data'] = json.dumps(card.serialize(request.user))
    context['message'] = message
    return render(request, 'Cards/card_profile.html', context)

def new_card(request):
    message = ''
    card_data = ''
    context = {}
    is_card_created = False
    if request.method == "POST":        
        form = CardForm(request.POST, user = request.user)
        if form.is_valid():
            card = form.save()
            is_card_created = True
            card_data = json.dumps(card.serialize(request.user))
   
    initial = {}    
    if is_card_created:
        initial['common_tags'] = [t.pk for t in card.tags.filter(user = None)]
        initial['user_tags'] = [t.pk for t in card.tags.filter(user = request.user)]
        message = 'Card succesfully created' 

    form = CardForm( user =request.user,initial = initial)    
    context['tags_data'] = json.dumps(get_tags_dict(request.user,False))
    context['form'] = form 
    context['message'] = message 
    context['card_data'] = card_data
   
    return render(request, 'Cards/new_card.html', context)

def test(request):
    return render(request, 'Cards/test.html', {})

@csrf_exempt
def search(request):
    FA_data = [x.serialize() for x in Face_attribute.objects.all()]

    FAs_options = ['Any'] + FA_data

    if request.method == "GET": 
        return render(request, 'Cards/search.html', {'FAs_options': FAs_options})
    
    if request.method == "POST":
        filter = {'search': {'keyword': request.POST['search'], "FA":request.POST['FA']}}
        cards = filter_cards(filter)    
        cards = cards[:10]         
       
        data = json.dumps(get_card_set_data(cards, request.user))
        context ={
            'FAs_options': FAs_options,
            'card_set_data':data,
            'cards_count':range(len(cards)),
            'search':  request.POST['search'],
            'defaultFA': request.POST['FA'],
            'FA_data': json.dumps(FA_data)
        }
         
        return render(request, 'Cards/search.html', context)
