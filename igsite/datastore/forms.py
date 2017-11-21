from django import forms
from models import DataTexture

class TextureForm(forms.ModelForm):
    class Meta:
        model = DataTexture
        exclude = {'file_uuid'}
