from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Card

# Create your views here.
def index(request):
    return render(request,"Cards/index.html",) 

def game (request):
    context = {}
    return render(request, "Cards/game.html")

@csrf_exempt
def get_cards(request):
    
   result = {}
   result ['cards'] = [card.serialize() for card in Card.objects.all()]
   return JsonResponse(result, safe=False)
