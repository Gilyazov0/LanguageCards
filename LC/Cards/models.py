from django.db import models
from django.utils.timezone import now
from django.contrib.auth.models import AbstractUser

from random import shuffle


class User(AbstractUser):
    def is_advanced(self):
        """      
        Returns:
            bool:
        """
        return self.is_authenticated and self.profile.is_advanced_user


class UserProfile(models.Model):
    @staticmethod
    def get_or_create_default_profile(user):
        if hasattr(user, 'profile'):
            return user.profile
        new_profile = UserProfile.objects.create(user=user)
        new_profile.save()
        return new_profile

    user = models.OneToOneField(
        User, blank=False, null=False, on_delete=models.CASCADE, related_name='profile')
    is_advanced_user = models.BooleanField(
        null=False, default=False, blank=True)

    def __str__(self):
        return f"id: {self.id} user {self.user} advanced {self.is_advanced_user}"


class TagManager(models.Manager):

    #     return JsonResponse(result, safe=False)

    def get_tags_dict(self, user, add_common_tags=True):
        """
        Args:
            user (User): 
            add_common_tags (bool, optional): Defaults to True.

        Returns:
            dict: {
                    'tags': [Tag.serialize()],
                    'user_tags': [Tag.serialize()]
                    }
        """
        result = {}
        if add_common_tags:
            tags = self.filter(user=None)
            result['tags'] = [tag.serialize() for tag in tags]
        if user.is_authenticated:
            result['user_tags'] = [tag.serialize()
                                   for tag in self.filter(user=user)]
        else:
            result['user_tags'] = []
        return result


class Tag (models.Model):
    name = models.CharField(null=False, max_length=20, unique=False)
    user = models.ForeignKey(
        User, blank=True, null=True, on_delete=models.CASCADE, related_name='user_tags')

    objects = TagManager()

    def serialize(self):
        return {"name": self.name, "id": self.id}

    def __str__(self):
        if self.user:
            return self.user.username + ":" + self.name
        return self.name

    class Meta:
        unique_together = (('name', 'user'),)


class CardManager(models.Manager):
    def _filter_cards_by_keyword(self, filter):
        """
        Looking for Cards with value in any or specific FA

        Args:
            filter (dict): {'keyword': keyword, 'FA': FA}

        Returns:
            QuerySet[Card]: 
        """

        fa = filter.get('FA')
        if fa and fa != "Any":
            return self.filter(FAs__value__icontains=filter.get('keyword'), FAs__FA__name=fa).distinct()
        else:
            return self.filter(FAs__value__icontains=filter.get('keyword')).distinct()

    def _filter_cards_by_tags(self, filter):
        """
        Looking for Cards with tags matching filters

        Args:
            filter (List): [{'include':[tag_id, ..], 'exclude':[tag_id, ...]} ...]

        Returns:
            QuerySet[Card]: 
        """

        if not filter:
            return self.all()

        cards_result = None
        for tags_pair in filter:

            cards = self.all()
            tags_include = tags_pair.get("include", [])
            tags_exclude = tags_pair.get("exclude", [])

            for tag in tags_include:
                cards = cards.filter(tags__id=tag)
            for tag in tags_exclude:
                cards = cards.exclude(tags__id=tag)
            if cards_result == None:
                cards_result = cards
            else:
                cards_result = cards_result.union(cards)
        return cards_result

    def filter_cards(self, filters):
        """
        Looking for Cards with tags and keywords matching filters    

        Args:
            filters (dict): {'search': {'keyword': keyword, 'FA': FA},
                            'tag_filter': [{'include':[tag_id, ..], 
                                            'exclude':[tag_id, ...]} ...]}
        Returns:
            QuerySet[Card]: 
        """
        cards = self.all()
        if filters.get('tag_filter'):
            cards = cards.intersection(
                self._filter_cards_by_tags(filters.get('tag_filter')))

        if filters.get('search'):
            cards = cards.intersection(
                self._filter_cards_by_keyword(filters.get('search')))
        return cards

    def get_card_set_data(self, cards, user):
        """
        cards data with shuffled order and tags data

        Args:
            cards (QuerySet[Card]): 
            user (User): 

        Returns:
            dict: {'cards':{
                            'cards': {Card.id: Card.serialize()}, 
                            'order': [Card.id]
                            },
                   'tags': {
                            'tags': [Tag.id],
                            'user_tags': [Tag.id]
                           } 
                   }
        """
        cards_dict = {}
        cards_order = []
        for card in cards:
            cards_dict[card.id] = card.serialize(user)
            cards_order.append(card.id)

        result = {}
        result['cards'] = {'cards': cards_dict, 'order': cards_order}
        result['tags'] = Tag.objects.get_tags_dict(user)
        shuffle(result['cards']['order'])

        return result


class Card(models.Model):
    tags = models.ManyToManyField(Tag, related_name='cards')
    last_edited = models.DateTimeField(null=False)

    objects = CardManager()

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
            result['user_tags'] = [tag.serialize()
                                   for tag in self.tags.filter(user=user)]

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

    def serialize(self):
        return self.name


class FA_value (models.Model):
    card = models.ForeignKey(
        Card, on_delete=models.CASCADE, null=False, related_name='FAs')
    FA = models.ForeignKey(
        Face_attribute, on_delete=models.PROTECT, null=False, related_name='values')
    value = models.CharField(max_length=100, null=False)

    def __str__(self):
        return '!!!'  # f"{self.card.id}.{self.FA} = {self.value}"


class Game_Settings(models.Model):
    user = models.ForeignKey(
        User, blank=False, null=False, on_delete=models.CASCADE)
    value = models.TextField()
    name = models.CharField(max_length=50, blank=False, null=False)

    class Meta:
        unique_together = (('name', 'user'),)
