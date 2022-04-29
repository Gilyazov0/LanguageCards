from django.urls import path
from django.conf.urls.static import static
from django.conf import settings
from . import views

app_name = 'Language Cards'
urlpatterns = [
     path(route='', view=views.index, name='index'),
     path(route='game/', view=views.game, name='game'),
     path(route='get_cards', view=views.get_cards, name='get_cards'),
     path(route='get_metadata', view=views.get_metadata, name='get_metadata'),      
     path(route='set_card_tag', view=views.set_card_tag, name='set_card_tag'),     
     path(route='delete_card_tag', view=views.delete_card_tag, name='delete_card_tag'),   
     path('registration/', views.registration_request, name='registration'),   
     path('login/', views.login_request, name='login'),  
     path('logout/', views.logout_request, name='logout'),
     path('profile/', views.profile, name='profile'),
     path(route='create_tag', view=views.create_tag, name='create_tag'),      
     path(route='delete_tag', view=views.delete_tag, name='delete_tag'),
     path('card_profile/<int:card_id>/', views.card_profile, name='card_profile'),      
     path('new_card/', views.new_card, name='new_card'), 
     path('test/', views.test, name='test'), 
     path('search/', views.search, name='search'), 
 ]  + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) 