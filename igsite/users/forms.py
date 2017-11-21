from django import forms
from models import User

class RegistrationForm(forms.ModelForm):
    class Meta:
        password = forms.CharField(widget=forms.PasswordInput)      
        model = User
        widgets = {
            'password': forms.PasswordInput(),
            'confirm_password': forms.PasswordInput(),
        }
        exclude = {'active', 'verification_code'} 
    def __init__(self, *args, **kwargs):
        super(RegistrationForm, self).__init__(*args, **kwargs)
        confirm_password = forms.CharField(widget=forms.PasswordInput)
        self.fields['confirm_password'] = confirm_password
        self.fields['first_name'].required = True
        self.fields['last_name'].required = True
        self.fields['email'].required = True        
        self.fields['password'].required = True
        self.fields['confirm_password'].required = True
        self.fields.keyOrder = ['first_name', 'last_name', 'email', 'password', 'confirm_password']
    def clean(self):
        password = self.cleaned_data.get('password')
        confirm_password = self.cleaned_data.get('confirm_password')
        if (not password or not confirm_password) or password != confirm_password:
            raise forms.ValidationError("Passwords don't match")
        return self.cleaned_data

class ResetPasswordForm(forms.ModelForm):
    class Meta:
        password = forms.CharField(widget=forms.PasswordInput)      
        model = User
        fields = {'email'}
        
class VerifyForm(forms.ModelForm):
    class Meta:
        password = forms.CharField(widget=forms.PasswordInput)      
        model = User
        widgets = {
            'password': forms.PasswordInput(),
        }
        fields = {'email', 'password'}
    def __init__(self, *args, **kwargs):
        super(VerifyForm, self).__init__(*args, **kwargs)
        self.fields.keyOrder = ['email', 'password']
        
class LoginForm(forms.ModelForm):
    class Meta:   
        password = forms.CharField(widget=forms.PasswordInput)      
        model = User
        widgets = {
            'password': forms.PasswordInput(),
        }
        fields = {'email', 'password'}
    def __init__(self, *args, **kwargs):
        super(LoginForm, self).__init__(*args, **kwargs)
        self.fields.keyOrder = ['email', 'password']
    def clean(self):
        password = self.cleaned_data.get('password')
        if not password:
            raise forms.ValidationError("No password supplied")
        return self.cleaned_data

