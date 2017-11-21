from common.models import UUIDField, Base64Field, models
from users.models import User
from time import time

def get_upload_filename(instance, filename):
    return '%s_%s' % (str(time()).replace('.', '_'), filename)
    
class DataFile(models.Model):
    uuid = UUIDField(primary_key=True, editable=False)
    user_uuid = models.ForeignKey(User)
    file_name = models.CharField(max_length=128)
    file_info = models.CharField(max_length=512)    

class DataStore(models.Model):
    uuid = UUIDField(primary_key=True, editable=False)
    file_uuid = models.ForeignKey(DataFile)
    field = models.CharField(max_length=128)
    type = models.IntegerField()
    data = Base64Field()
    
class DataTexture(models.Model):
    uuid = UUIDField(primary_key=True, editable=False)
    file_uuid = models.ForeignKey(DataFile)
    name = models.CharField(max_length=128)
    file_name = models.FileField(upload_to=get_upload_filename)
    def __unicode__(self):
        return self.name

