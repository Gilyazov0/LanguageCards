from itertools import count
import json
from datetime import datetime
from email import message
from turtle import pos
from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import get_object_or_404, render
from django.urls import reverse
from django.utils.timezone import make_aware
from django.core.paginator import Paginator
from django.http import JsonResponse
from .models import Folower, User,Post,Like
from django.views.decorators.csrf import csrf_exempt
from django.db.models import OuterRef, Subquery,Value,Count


def index(request):
    if request.method == "POST":
        content = request.POST["content"]
        post = Post()
        post.author = request.user
        post.description = content
        post.save()
        return HttpResponseRedirect(reverse("index"))
    return render(request, "network/index.html", { "message":"" })


def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "network/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "network/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "network/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "network/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "network/register.html")

@csrf_exempt
def getposts(request):

    if request.method != "POST":
        return JsonResponse({"error": "GET request required."}, status=400)
    data = json.loads(request.body);
    pagenumber = data.get("pagenumber", 1);
    thisuser = get_object_or_404(User,pk=request.user.id);
    following = data.get("following", False)
    if following:
        UsersFollowed = (User.objects.filter(folowingUsers__UserFolowing = thisuser))
        posts = Post.objects.filter(author__in = UsersFollowed).annotate()
    else:
        posts = Post.objects.all().order_by('-timestamp')
  
    thisUserLikes = Like.objects.filter(post = OuterRef("pk"),author = thisuser).annotate(isliked=Value(True))
    posts = posts.annotate(liked = Subquery(thisUserLikes.values('isliked')))
    posts = posts.annotate(likes_count = Count('likes'))

    p = Paginator(posts, 5)
    
    if p.num_pages < pagenumber:
         return JsonResponse({"error": "Page number is too big"}, status=400)   
    page = p.page(pagenumber)  
    return JsonResponse({"isnextpage":page.has_next(),"posts":[post.serialize("liked","likes_count") for post in  page]}, safe=False)
    
def users(request):
    id = int(request.GET.get("id",0))
    user = get_object_or_404(User,pk=id)
    thisuser = get_object_or_404(User,pk=request.user.id)
    folowers = Folower.objects.filter(UserFolowed =  user,UserFolowing = thisuser)
    isfollowing = folowers.count()>0;
    return render(request, "network/user.html", {"userToShow":user,
                                                "folowedUsers":user.folowedUsers.count(),
                                                "folowingUsers":user.folowingUsers.count(),
                                                "isfollowing":isfollowing})

@csrf_exempt
def follow(request):
    data = json.loads(request.body);
    id = data.get("userID", -1);
    user = get_object_or_404(User,pk=id)
    thisuser = get_object_or_404(User,pk=request.user.id)
    folowers = Folower.objects.filter(UserFolowed =  user,UserFolowing = thisuser)
    if folowers.count()>0:
        for folower in folowers:
            folower.delete()
        isfolowing = False
    else:
        folower = Folower()
        folower.UserFolowed = user
        folower.UserFolowing = thisuser
        folower.save()
        isfolowing = True
    return JsonResponse({"isfolowing":isfolowing})

@csrf_exempt
def editpost(request):

    data = json.loads(request.body)
    id = data.get("id", -1)
    description = data.get("description", -1)
    post = get_object_or_404(Post,pk=id)

    if post.author.id != request.user.id:
        return JsonResponse({"error": "Access denied"}, status=400)   

    post.description = description
    post.save()
    return JsonResponse({"post":post.serialize()})
 

def following(request):
    return render(request, "network/index.html", { "message":""})

@csrf_exempt
def like(request):
    data = json.loads(request.body);
    id = data.get("PostId", -1);
    post = get_object_or_404(Post,pk=id)
    thisuser = get_object_or_404(User,pk=request.user.id)
    likes = Like.objects.filter(post =  post,author = thisuser)
    if likes.count()>0:
        for like in likes:
            like.delete()
        isLiked = False
    else:
        like = Like()
        like.author = thisuser
        like.post = post
        like.save()
        isLiked = True
    return JsonResponse({"isLiked":isLiked,
                         "likes_count":Like.objects.filter(post =  post).count()})
