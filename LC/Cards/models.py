from unittest import result
from django.db import models
from django.utils.timezone import now
from django.contrib.auth.models import User



class Tag (models.Model):
    name = models.CharField(null=False, max_length=20, unique=True)
    user = models.ForeignKey(
        User, null=True, on_delete=models.CASCADE, related_name='user_tags')

    def serialize(self):
        return {"name": self.name,"id":self.id}

    def __str__(self):
        if self.user:
            return  self.user.username + ":" +self.name 
        return self.name 


class Card(models.Model):
    tags = models.ManyToManyField(Tag, related_name='cards')
    last_edited = models.DateTimeField(null=False)

    def save(self, *args, **kwargs):
        self.last_edited = now()
        return super().save(*args, **kwargs)

    def serialize(self, user=None):
        result = {'id': self.id}

        tags_ = []
        for tag in self.tags.filter(user=None):
            tags_.append(tag.serialize())
        result['tags'] = tags_

        result['user_tags'] = []
        if user.is_authenticated:
            result['user_tags'] =[tag.serialize() for tag in self.tags.filter(user = user)]

        FAs_ = {}
        for FA in self.FAs.all():
            FAs_[str(FA.FA)] = FA.value
        result['FAs'] = FAs_

        return result

    def __str__(self):
        tags = ''
        for tag in self.tags.all():
            tags += f"<{tag}>"

        FAs = ''
        for FA in self.FAs.all():
            FAs += f"[{FA.FA}={FA.value}]"

        return f"id: {self.id} {FAs} {tags}"


class Face_attribute(models.Model):
    name = models.CharField(null=False, max_length=50, unique=True)

    def __str__(self):
        return self.name


class FA_value (models.Model):
    card = models.ForeignKey(
        Card, on_delete=models.CASCADE, null=False, related_name='FAs')
    FA = models.ForeignKey(
        Face_attribute, on_delete=models.PROTECT, null=False, related_name='values')
    value = models.CharField(max_length=100, null=False)

    def __str__(self):
        return f"{self.card.id}.{self.FA} = {self.value}"
