from django.test import TestCase
from ..models import Face_attribute, FA_value, Card, Tag, User, Game_Settings
from django.urls import reverse
from ..views import *


class TestCalls(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user1 = User(username='user1')
        cls.user1.set_password('123')
        cls.user1.save()
        cls.user1_password = '123'
        cls.user2 = User(username='user2')
        cls.user2.set_password('321')
        cls.user2.save()
        cls.user2_password = '321'

        cls.common_tag1 = Tag.objects.create(name='common_tag1', user=None)
        cls.common_tag2 = Tag.objects.create(name='common_tag2', user=None)
        cls.user_tag1 = Tag.objects.create(name='user_tag1', user=cls.user1)
        cls.user_tag2 = Tag.objects.create(name='user_tag2', user=cls.user1)

        cls.common_tags_list = [
            cls.common_tag1.serialize(), cls.common_tag2.serialize()]

        cls.user1_user_tag_list = [
            cls.user_tag1.serialize(), cls.user_tag2.serialize()]

        cls.card1 = Card.objects.create()
        cls.card1.tags.set([cls.common_tag1, cls.user_tag1])
        cls.card1.save()
        cls.card2 = Card.objects.create()
        cls.card2.tags.set([cls.common_tag1])
        cls.card2.save()
        cls.card3 = Card.objects.create()
        cls.card3.tags.set([cls.common_tag1, cls.common_tag2])
        cls.card3.save()

        FA_hebrew = Face_attribute.objects.create(name='на иврите')
        FA_ru = Face_attribute.objects.create(name='на русском')
        FA_transcription = Face_attribute.objects.create(name='транскрипция')

        FA_value.objects.create(card=cls.card1, FA=FA_ru, value='папа')
        FA_value.objects.create(card=cls.card1, FA=FA_hebrew, value='אבא')
        FA_value.objects.create(
            card=cls.card1, FA=FA_transcription, value='аба')

        FA_value.objects.create(card=cls.card2, FA=FA_ru, value='мама')
        FA_value.objects.create(card=cls.card2, FA=FA_hebrew, value='אימא')
        FA_value.objects.create(
            card=cls.card2, FA=FA_transcription, value='има')

        cls.game_settings = Game_Settings.objects.create(
            name='gm_name', value='gm_value', user=cls.user1)

    def test_search(cls):
        response = cls.client.get(reverse('Cards:search'))
        expected = ['Any', 'на иврите', 'на русском', 'транскрипция']
        cls.assertEqual(expected, response.context[-1]['FAs_options'])

        response = cls.client.post(
            reverse('Cards:search'), {'search': 'мама', 'FA': 'Any'})
        expected = ['Any', 'на иврите', 'на русском', 'транскрипция']
        cls.assertEqual(expected, response.context[-1]['FAs_options'])

        cls.assertEqual(range(0, 1), response.context[-1]['cards_count'])
        cls.assertEqual('мама', response.context[-1]['search'])

        expected = ['на иврите', 'на русском', 'транскрипция']
        cls.assertEqual(expected, json.loads(response.context[-1]['FA_data']))

        expected = {'cards': {'cards': {'2': {'id': 2, 'tags': [{'name': 'common_tag1', 'id': 1}],
                                              'user_tags': [], 'FAs': {'на русском': 'мама', 'на иврите': 'אימא', 'транскрипция': 'има'}}},
                              'order': [2]},
                    'tags': {'tags': [{'name': 'common_tag1', 'id': 1}, {'name': 'common_tag2', 'id': 2}], 'user_tags': []}}

        cls.assertEqual(expected, json.loads(
            response.context[-1]['card_set_data']))
