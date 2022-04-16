from django.urls import path
from django.conf.urls.static import static
from django.conf import settings
from . import views

app_name = 'Language Cards'
urlpatterns = [
     path(route='', view=views.index, name='index'),
     path(route='game/', view=views.game, name='game'),
     path(route='get_cards', view=views.get_cards, name='get_cards'),
     ]  + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
