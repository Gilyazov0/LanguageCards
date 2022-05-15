from django.urls import path
from django.conf.urls.static import static
from django.conf import settings
from . import views
from . import api

app_name = 'Language Cards'
urlpatterns = [
    path(route='', view=views.game, name='index'),
    path(route='game/', view=views.game, name='game'),
    path(route='get_cards', view=api.get_cards, name='get_cards'),
    path(route='get_cards_count', view=api.get_cards_count, name='get_cards_count'),
    path(route='get_metadata', view=api.get_metadata, name='get_metadata'),
    path(route='set_card_tag', view=api.set_card_tag, name='set_card_tag'),
    path(route='delete_card_tag', view=api.delete_card_tag, name='delete_card_tag'),
    path(route='registration/', view=views.registration_request, name='registration'),
    path(route='login/', view=views.login_request, name='login'),
    path(route='logout/', view=views.logout_request, name='logout'),
    path(route='profile/', view=views.profile, name='profile'),
    path(route='create_tag', view=views.create_tag, name='create_tag'),
    path(route='delete_tag', view=views.delete_tag, name='delete_tag'),
    path(route='card_profile/<int:card_id>/',
         view=views.card_profile, name='card_profile'),
    path(route='new_card/', view=views.new_card, name='new_card'),
    path(route='search/', view=views.search, name='search'),
    path(route='card_list/', view=views.card_list, name='card_list'),
    path(route='save_game_settings/', view=api.save_game_settings,
         name='save_game_settings'),
    path(route='get_game_settings/',
         view=api.get_game_settings, name='get_game_settings'),

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
