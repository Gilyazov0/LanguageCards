from django.contrib import admin
from .models import Card, Tag, Face_attribute, FA_value

# Register your models here.

class StringModelAdmin(admin.ModelAdmin):
    list_display = ["__str__",]

class FAModelInline(admin.StackedInline):
    model = FA_value
 
# Register your models here.
    
class CardAdmin(StringModelAdmin):
    inlines = [FAModelInline]
    exclude = ('last_edited',)

admin.site.register(Card,CardAdmin)
admin.site.register(Tag,StringModelAdmin)
admin.site.register(Face_attribute,StringModelAdmin)
admin.site.register(FA_value,StringModelAdmin)