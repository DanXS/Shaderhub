from django.conf.urls import patterns, url

from users import views

urlpatterns = patterns('',
    url(r'^register', views.register, name='register'),
    url(r'^resetpassword', views.resetpassword, name='resetpassword'),
    url(r'^verify/(?P<user_uuid>[^/]+)/(?P<verification_code>[^/]+)$', views.verifyemail, name='verifyemail'),
    url(r'^verify', views.verify, name='verify'),
    url(r'^login', views.login, name='login'),
    url(r'^logout', views.logout, name='logout'),   
    url(r'^$', views.index, name='index'),
    url(r'^(?P<user_uuid>[^/]+)/$', views.profile, name='profile')
)