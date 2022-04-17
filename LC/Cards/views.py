from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Card
from random import shuffle

# Create your views here.
def index(request):
    return render(request,"Cards/index.html",) 

def game (request):
    context = {}
    return render(request, "Cards/game.html")

@csrf_exempt
def get_cards(request):
    
   result = {}
   cards = Card.objects.all()
   cards_dict ={}
   cards_order =[]
   for card in cards:
       cards_dict[card.id] = card.serialize()
       cards_order.append(card.id) 
   shuffle(cards_order) 

   result ['cards'] = {'cards':cards_dict,'order':cards_order} 

   return JsonResponse(result, safe=False)
