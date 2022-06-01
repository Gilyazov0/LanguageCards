import json
from django.test import TestCase
from ..models import Face_attribute, FA_value, Card, Tag, User, Game_Settings
import json


class ApiTest(TestCase):
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

    def test_get_game_settings(cls):
        cls.client.login(username=cls.user1.username,
                         password=cls.user1_password)
        request = json.dumps({'name': cls.game_settings.name})
        result = cls.client.generic(
            'POST', '/Cards/get_game_settings/', request, content_type="application/json")
        expected = {'settings': cls.game_settings.value}

        cls.assertEqual(expected, result.json())

    def test_set_game_settings(cls):
        cls.client.login(username=cls.user1.username,
                         password=cls.user1_password)
        request = json.dumps(
            {'name': cls.game_settings.name, 'value': 'new_gm_value'})
        result = cls.client.generic(
            'POST', '/Cards/save_game_settings/', request)

        cls.assertEqual(200, result .status_code)

        request = json.dumps({'name': cls.game_settings.name})
        result = cls.client.generic(
            'POST', '/Cards/get_game_settings/', request, content_type="application/json")
        cls.assertEqual({'settings': 'new_gm_value'}, result.json())

    def test_get_cards(cls):
        # get cards by filter
        cls.client.login(username=cls.user1.username,
                         password=cls.user1_password)
        request = json.dumps({'tag_filter': [{'include': [cls.common_tag1.id], 'exclude':[
                             cls.common_tag2.id, cls.user_tag1.id]}]})
        result = cls.client.generic(
            'POST', '/Cards/get_cards', request, content_type="application/json")

        expected = {
            'cards': {'cards': {str(cls.card2.id): cls.card2.serialize(user=cls.user1)}, 'order': [cls.card2.id]},
            'tags': {'tags': cls.common_tags_list,
                     'user_tags': cls.user1_user_tag_list}}

        cls.assertEqual(expected, result.json())

        # get cards by keyword
        request = json.dumps(
            {'search': {'keyword': 'папа', 'FA': 'на русском'}})
        result = cls.client.generic(
            'POST', '/Cards/get_cards', request, content_type="application/json")

        expected = {
            'cards': {'cards': {str(cls.card1.id): cls.card1.serialize(user=cls.user1)}, 'order': [cls.card1.id]},
            'tags': {'tags': cls.common_tags_list,
                     'user_tags': cls.user1_user_tag_list}}
        cls.assertEqual(expected, result.json())

    def test_get_cards_count(cls):

        cls.client.login(username=cls.user1.username,
                         password=cls.user1_password)
        request = json.dumps({'tag_filter': [{'include': [cls.common_tag1.id], 'exclude':[
                             cls.common_tag2.id, cls.user_tag1.id]}]})
        result = cls.client.generic(
            'POST', '/Cards/get_cards_count', request, content_type="application/json")

        expected = {'cards_count': 1}
        cls.assertEqual(expected, result.json())

    def test_get_metadata(cls):

        cls.client.login(username=cls.user1.username,
                         password=cls.user1_password)
        result = cls.client.get('/Cards/get_metadata').json()

        expected = ['на иврите', 'на русском', 'транскрипция']
        cls.assertEqual(expected, result['FAs'])

        expected = [{'name': cls.common_tag1.name, 'id': cls.common_tag1.id},
                    {'name': cls.common_tag2.name, 'id': cls.common_tag2.id}]
        cls.assertEqual(expected, result['tags'])

        expected = [{'id': cls.user_tag1.id, 'name': cls.user_tag1.name},
                    {'id': cls.user_tag2.id, 'name': cls.user_tag2.name}]
        cls.assertEqual(expected, result['user_tags'])

    def test_set_card_tag(cls):

        # Case request user != tag user
        cls.client.login(username='user2',  password=cls.user2_password)
        request = json.dumps(
            {'tag_id': cls.user_tag1.id, 'card_id': cls.card2.id})
        result = cls.client.generic(
            'POST', '/Cards/set_card_tag', request, content_type="application/json")

        cls.assertEqual(200, result.status_code)
        expected = {'id': cls.card2.id, 'tags': [{'id': cls.common_tag1.id, 'name': cls.common_tag1.name}], 'user_tags': [], 'FAs': {
            'на русском': 'мама', 'на иврите': 'אימא', 'транскрипция': 'има'}}
        cls.assertEqual(expected, result.json())

        # Case request user == tag user
        cls.client.login(username=cls.user1.username,
                         password=cls.user1_password)
        request = json.dumps(
            {'tag_id': cls.user_tag1.id, 'card_id': cls.card2.id})
        result = cls.client.generic(
            'POST', '/Cards/set_card_tag', request, content_type="application/json")

        cls.assertEqual(200, result.status_code)
        expected = {'id': cls.card2.id, 'tags': [{'id': cls.common_tag1.id, 'name': cls.common_tag1.name}],
                    'user_tags': [{'name': cls.user_tag1.name, 'id': cls.user_tag1.id}], 'FAs': {
                    'на русском': 'мама', 'на иврите': 'אימא', 'транскрипция': 'има'}}
        cls.assertEqual(expected, result.json())

    def test_delete_card_tag(cls):

        # Case request user != tag user
        cls.client.login(username='user2',  password=cls.user2_password)
        request = json.dumps(
            {'tag_id': cls.user_tag1.id, 'card_id': cls.card1.id})
        result = cls.client.generic(
            'POST', '/Cards/delete_card_tag', request, content_type="application/json")

        cls.assertEqual(200, result.status_code)
        expected = {'id': cls.card1.id, 'tags': [{'name': cls.common_tag1.name, 'id': cls.common_tag1.id}], 'user_tags': [
        ], 'FAs': {'на русском': 'папа', 'на иврите': 'אבא', 'транскрипция': 'аба'}}

        cls.assertEqual(expected, result.json())

        # Case request user == tag user
        cls.client.login(username=cls.user1.username,
                         password=cls.user1_password)
        request = json.dumps(
            {'tag_id': cls.user_tag1.id, 'card_id': cls.card1.id})
        result = cls.client.generic(
            'POST', '/Cards/delete_card_tag', request, content_type="application/json")

        cls.assertEqual(200, result.status_code)
        expected = {'id': cls.card1.id, 'tags': [{'name': cls.common_tag1.name, 'id': cls.common_tag1.id}], 'user_tags': [
        ], 'FAs': {'на русском': 'папа', 'на иврите': 'אבא', 'транскрипция': 'аба'}}
        cls.assertEqual(expected, result.json())
