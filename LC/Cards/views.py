import json

from django.urls import reverse
from django.shortcuts import get_object_or_404, render, redirect
from django.http import HttpResponseRedirect, HttpResponse
from django.contrib.auth import login, logout, authenticate
from xmlrpc.client import ResponseError

from .forms import *
from .models import Card, Tag, Face_attribute, User


def login_request(request):
    context = {}
    if request.method == "POST":
        username = request.POST['username']
        password = request.POST['psw']
        user = authenticate(username=username, password=password)
        UserProfile.get_or_create_default_profile(user)
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
            UserProfile.get_or_create_default_profile(user)
            login(request, user)
            return redirect("Cards:index")
        else:
            context['message'] = "User already exists."
            return render(request, 'Cards/registration.html', context)


def create_tag(request):
    """ 
    Django view. 
    Create user tag - an instance of models.Tag (not assign tag to Card).

    Args:
        request (HttpRequest):

    Returns:
        HttpResponseRedirect: rederect to user profile
    """
    if request.method == "POST" and request.user.is_authenticated:
        user_tag_name = request.POST['user_tag']
        tag = Tag()
        tag.user = request.user
        tag.name = user_tag_name
        tag.save()

        return HttpResponseRedirect(reverse('Cards:profile'))


def delete_tag(request):
    """
    Django view. 
    Delete user tag - an instance of models.Tag (not delete tag from Card).

    Args:
        request (HttpRequest):

    Returns:
        HttpResponseRedirect: rederect to user profile
    """
    if request.method == "POST" and request.user.is_authenticated:
        tag_id = int(request.POST['tag_id'])
        tag = get_object_or_404(Tag, pk=tag_id)
        if tag.user == request.user or request.user.is_advanced():
            tag.delete()
        return HttpResponseRedirect(reverse('Cards:profile'))


def profile(request):
    """
    User profile (not Card profile)

    Args:
        request (HttpRequest):

    Returns:
        HttpResponse: user profile
        ResponseError: if user is not authenticated
    """
    if not request.user.is_authenticated:
        return ResponseError('User is not authenticated')
    context = {}
    context['user_tags'] = Tag.objects.filter(user=request.user)

    return render(request, 'Cards/profile.html', context)


def game(request):
    """
    rander game page

    Args:
        request (HttpRequest):

    Returns:
        HttpResponse: game page    
    """
    return render(request, "Cards/game.html")


def card_profile(request, card_id):
    """
    Card profile (not User profile). 
    If POST edit or delete card      

    Args:
        request (HttpRequest):
        card_id (int): 

    Returns:
        HttpResponse: Card profile
    """
    message = ''
    card = get_object_or_404(Card, pk=card_id)
    if request.method == "POST" and request.user.is_advanced():
        if request.POST['action'] == 'Save':
            form = CardForm(request.POST, user=request.user, instance=card)
            if form.is_valid():
                form.save()
                message = 'Card successfully saved'
        if request.POST['action'] == 'Delete':
            if request.user.is_advanced():
                card.delete()
                return HttpResponse("Card successfully deleted")
            else:
                return HttpResponse("Access denied")
    else:
        form = CardForm(instance=card, user=request.user)
    context = {}
    context['tags_data'] = json.dumps(
        Tag.objects.get_tags_dict(request.user, False))
    context['form'] = form
    context['card_id'] = card_id
    context['card_data'] = json.dumps(card.serialize(request.user))
    context['message'] = message
    return render(request, 'Cards/card_profile.html', context)


def new_card(request):
    """
    Renders CardForm to create new card. 
    Keeps fields values as initial values if several cards created in a row

    Args:
        request (HttpRequest):

    Returns:
       HttpResponse: card creation page
    """
    message = ''
    card_data = ''
    context = {}
    is_card_created = False
    if request.method == "POST" and request.user.is_advanced():
        form = CardForm(request.POST, user=request.user)
        if form.is_valid():
            card = form.save()
            is_card_created = True
            card_data = json.dumps(card.serialize(request.user))

    initial = {}
    if is_card_created:
        initial['common_tags'] = [t.pk for t in card.tags.filter(user=None)]
        initial['user_tags'] = [
            t.pk for t in card.tags.filter(user=request.user)]
        message = 'Card successfully created'

    form = CardForm(user=request.user, initial=initial)
    context['tags_data'] = json.dumps(
        Tag.objects.get_tags_dict(request.user, False))
    context['form'] = form
    context['message'] = message
    context['card_data'] = card_data

    return render(request, 'Cards/new_card.html', context)


def card_list(request):
    """
    shows list of cards based on url

    Args:
        request (HttpRequest):_

    Returns:
       HttpResponse: cards list page
    """

    cards_ids = [int(id) for id in request.GET.getlist('id')]
    cards = Card.objects.filter(id__in=cards_ids)
    data = json.dumps(Card.objects.get_card_set_data(cards, request.user))
    FA_data = [x.serialize() for x in Face_attribute.objects.all()]

    context = {
        'card_set_data': data,
        'cards_count': range(len(cards)),
        'defaultFA': request.GET['FA'],
        'FA_data': json.dumps(FA_data)
    }

    return render(request, 'Cards/card_list.html', context)


def search(request):
    """
    renders page to search for Cards by FA value 

    Args:
        request (HttpRequest):

    Returns:
       HttpResponse: cards list page
    """
    FA_data = [x.serialize() for x in Face_attribute.objects.all()]

    FAs_options = ['Any'] + FA_data

    if request.method == "GET":
        return render(request, 'Cards/search.html', {'FAs_options': FAs_options})

    if request.method == "POST":
        filter = {'search': {
            'keyword': request.POST['search'], "FA": request.POST['FA']}}
        cards = Card.objects.filter_cards(filter)
        cards = cards[:10]

        data = json.dumps(Card.objects.get_card_set_data(cards, request.user))
        context = {
            'FAs_options': FAs_options,
            'card_set_data': data,
            'cards_count': range(len(cards)),
            'search':  request.POST['search'],
            'defaultFA': request.POST['FA'],
            'FA_data': json.dumps(FA_data)
        }

        return render(request, 'Cards/search.html', context)
