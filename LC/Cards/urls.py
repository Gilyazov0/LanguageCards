from django.urls import path
from django.conf.urls.static import static
from django.conf import settings
from . import views

app_name = 'Language Cards'
urlpatterns = [
     path(route='', view=views.index, name='index'),
     path(route='game/', view=views.game, name='game'),
     path(route='get_cards', view=views.get_cards, name='get_cards'),
     path(route='get_tags', view=views.get_tags, name='get_tags'),      
     path(route='set_card_tag', view=views.set_card_tag, name='set_card_tag'),     
     path(route='delete_card_tag', view=views.delete_card_tag, name='delete_card_tag'),   
     path('registration/', views.registration_request, name='registration'),   
     path('login/', views.login_request, name='login'),  
     path('logout/', views.logout_request, name='logout'),
     path('profile/', views.profile, name='profile'),
     path(route='create_tag', view=views.create_tag, name='create_tag'),      
     path(route='delete_tag', view=views.delete_tag, name='delete_tag'),      
     ]  + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) 