import json

from django.shortcuts import get_object_or_404
from django.http import JsonResponse

from .forms import *
from .models import Card, Tag, Face_attribute, Game_Settings


def get_cards(request):
    """
    return cards data to create card set

    Args:
        request (HttpRequest): body - json : {'search': {'keyword': keyword, 'FA': FA},
                                              'tag_filter': [{'include':[tag_id, ..], 
                                                              'exclude':[tag_id, ...]} ...]}

    Returns:
        JsonResponse: dict: {'cards':{
                                     'cards': {Card.id: Card.serialize()},
                                     'order': [Card.id]
                                     },
                             'tags': {
                                     'tags': [Tag.serialize()],
                                     'user_tags': [Tag.serialize()]
                                     }
                            }
    """
    data = json.loads(request.body)
    cards = Card.objects.filter_cards(data)

    result = Card.objects.get_card_set_data(cards, request.user)

    return JsonResponse(result, safe=False)


def get_cards_count(request):
    """
    returns number of cards for filters in request

    Args:
        request (HttpRequest): body - json : {'search': {'keyword': keyword, 'FA': FA},
                                              'tag_filter': [{'include':[tag_id, ..], 
                                                              'exclude':[tag_id, ...]} ...]}

    Returns:
        JsonResponse: {cards_count: int}
    """

    data = json.loads(request.body)
    cards = Card.objects.filter_cards(data)

    result = {'cards_count': cards.count()}

    return JsonResponse(result, safe=False)


def get_metadata(request):
    """
    returns all tags and FAs

    Args:
        request (HttpRequest): 

    Returns:
        dict: {'tags': {
                        'tags': [Tag.serialize()],
                        'user_tags': [Tag.serialize()]
                        },
              'FAs': [FA.serialize()]
              }
    """
    result = Tag.objects.get_tags_dict(request.user)
    result['FAs'] = [FA.serialize() for FA in Face_attribute.objects.all()]

    return JsonResponse(result, safe=False)


def set_card_tag(request):
    """
    set a user tag

    Args:
        request (HttpRequest): {'tag_id': int, 'card_id': int}

    Returns:
        JsonResponse: Card.serialize()
    """
    if request.method == "POST":
        data = json.loads(request.body)
        tag_id = int(data['tag_id'])
        card_id = int(data['card_id'])
        card = get_object_or_404(Card, pk=card_id)
        tag = get_object_or_404(Tag, pk=tag_id)
        if request.user == tag.user:
            if not card.tags.filter(id=tag_id):
                card.tags.add(tag)
                card.save()

    return JsonResponse(card.serialize(request.user), safe=False)


def delete_card_tag(request):
    """
    delete a user tag

    Args:
        request (HttpRequest): {'tag_id': int, 'card_id': int}

    Returns:
        JsonResponse: Card.serialize()
    """
    if request.method == "POST":
        data = json.loads(request.body)
        tag_id = int(data['tag_id'])
        card_id = int(data['card_id'])
        card = get_object_or_404(Card, pk=card_id)
        tag = get_object_or_404(Tag, pk=tag_id)
        if request.user == tag.user:
            if card.tags.filter(id=tag_id):
                card.tags.remove(tag)
                card.save()
    return JsonResponse(card.serialize(request.user), safe=False)


def save_game_settings(request):
    """     
    Args:
        request (HttpRequest): body json: {'name': Setting.name, 'value':Setting.value}

    Returns:
        JsonResponse: empty {}
    """
    if request.method == 'POST' and request.user.is_authenticated:
        data = json.loads(request.body)
        settings, created = Game_Settings.objects.get_or_create(
            user=request.user, name=data['name'])
        settings.value = data['value']
        settings.save()
        return JsonResponse({})


def get_game_settings(request):
    """
    Args:
        request (HttpRequest): body json: {'name': Setting.name}

    Returns:
        JsonResponse: {'settings': Settings.value}
    """
    if request.method == 'POST':
        settings = ''
        if request.user.is_authenticated:
            data = json.loads(request.body)
            settings = get_object_or_404(
                Game_Settings, user=request.user, name=data['name']).value

        return JsonResponse({'settings': settings})
