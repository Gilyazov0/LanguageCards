from argparse import ArgumentError
import django.forms as forms
from .models import *
from crispy_forms.helper import FormHelper


class CardForm(forms.ModelForm):
    class Meta:
        model = Card
        fields = []

    def __init__(self, *args, **kwargs):
        self.helper = FormHelper()
        self.helper.form_id = 'id-exampleForm'
        self.helper.form_class = 'blueForms'
        self.user = None

        self.edit = "false"

        fields = {}
        sorted_fields = []

        if kwargs.get('user'):
            self.user = kwargs.pop('user')
            fields['common_tags'] = forms.ModelMultipleChoiceField(
                queryset=Tag.objects.filter(user=None))
            fields['user_tags'] = forms.ModelMultipleChoiceField(
                queryset=Tag.objects.filter(user=self.user), required=False)
        else:
            raise ArgumentError('key argument user is required')

        face_attributes = Face_attribute.objects.all()
        for fa in face_attributes:
            field_name = 'fa_' + str(fa.id)
            fields[field_name] = forms.CharField(
                max_length=50, label=fa.name, required=False)
            sorted_fields.append(field_name)

        if kwargs.get('instance'):

            initial = kwargs.setdefault('initial', {})
            card = kwargs['instance']

            for fa in face_attributes:
                field_name = 'fa_' + str(fa.id)
                fa_value = card.FAs.filter(FA__id=fa.id)
                if fa_value.count() == 0:
                    initial[field_name] = ''
                else:
                    initial[field_name] = fa_value[0].value

            initial['common_tags'] = [
                t.pk for t in card.tags.filter(user=None)]
            initial['user_tags'] = [
                t.pk for t in card.tags.filter(user=self.user)]

        forms.ModelForm.__init__(self, *args, **kwargs)

        for field_key in fields.keys():
            self.fields[field_key] = fields[field_key]

        self.order_fields(sorted_fields)

    def save(self, commit=True):
        instance = forms.ModelForm.save(self, False)
        face_attributes = Face_attribute.objects.all()
        fa_values = []

        for fa in face_attributes:
            field_name = 'fa_' + str(fa.id)
            a = FA_value.objects.filter(FA=fa, card=instance)
            if a:

                fa_value_instance = a[0]
            else:
                fa_value_instance = FA_value()
            fa_value_instance.value = self.cleaned_data.get(field_name)
            fa_value_instance.card = instance
            fa_value_instance.FA = fa

            fa_values.append(fa_value_instance)

        old_save_m2m = self.save_m2m

        def save_m2m():
            old_save_m2m()
            tags_to_remove = instance.tags.filter(user=None)
            if not self.user:
                tags_to_remove = tags_to_remove.union(
                    instance.tags.filter(user=self.user))

            instance.tags.remove(*tags_to_remove)
            instance.tags.add(*self.cleaned_data['common_tags'])
            instance.tags.add(*self.cleaned_data['user_tags'])
        self.save_m2m = save_m2m

        if commit:
            instance.save()
            self.save_m2m()
            for fa_value in fa_values:
                fa_value.save()

        return instance
