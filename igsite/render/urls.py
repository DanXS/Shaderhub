from django.conf.urls import patterns, url

from render import views

urlpatterns = patterns('', 
    url(r'^(?P<file_uuid>[^/]+)/$', views.index, name='index'),
)