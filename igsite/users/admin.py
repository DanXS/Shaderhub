from django.contrib import admin
from users.models import User

class UserAdmin(admin.ModelAdmin):
    fields = ['first_name', 'last_name', 'email', 'active']

admin.site.register(User, UserAdmin)