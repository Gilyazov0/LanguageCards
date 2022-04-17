from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Card, Tag
from random import shuffle
import json

# Create your views here.
def index(request):
    return render(request,"Cards/index.html",) 

def game (request):
    context = {}
    return render(request, "Cards/game.html")

@csrf_exempt
def get_cards(request):
   data = json.loads(request.body)
   tags_include = data['filter'].get("tags_include", [])
   tags_exclude = data['filter'].get("tags_exclude", [])
   
   result = {}
   cards = Card.objects.filter(tags__name__in = tags_include ).exclude(tags__name__in = tags_exclude)
   cards_dict ={}
   cards_order =[]
   for card in cards:
       cards_dict[card.id] = card.serialize()
       cards_order.append(card.id) 
   shuffle(cards_order) 

   result ['cards'] = {'cards':cards_dict,'order':cards_order} 

   return JsonResponse(result, safe=False)

@csrf_exempt
def get_tags(request):    
   result = {}
   tags = Tag.objects.all()
   result['tags'] = [tag.serialize() for tag in tags]  

   return JsonResponse(result, safe=False)

