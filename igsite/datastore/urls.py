from django.conf.urls import patterns, url

from datastore import views

urlpatterns = patterns('',
    url(r'^uploadtest', views.uploadtest, name='uploadtest'),
    url(r'^uploadjson', views.uploadjson, name='uploadjson'),
    url(r'^uploadbindings', views.uploadbindings, name='uploadbindings'),
    url(r'^uploadimagetest', views.uploadimagetest, name='uploadimagetest'),
    url(r'^uploadimage', views.uploadimage, name='uploadimage'),
    url(r'^uploadthumb', views.uploadthumb, name='uploadthumb'),
    url(r'^dir/(?P<user_uuid>[^/]+)/$', views.getDir, name='dir'),
    url(r'^info/(?P<file_uuid>[^/]+)/$', views.info, name='info'),    
    url(r'^(?P<file_uuid>[^/]+)/$', views.downloadjson, name='downloadjson'),
)


