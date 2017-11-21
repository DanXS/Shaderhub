import uuid
import base64
from time import time
from django.db import models

class UUIDField(models.CharField) :
    
    def __init__(self, *args, **kwargs):
        kwargs['max_length'] = kwargs.get('max_length', 64 )
        kwargs['blank'] = True
        models.CharField.__init__(self, *args, **kwargs)
    
    def pre_save(self, model_instance, add):
        if add :
            value = str(uuid.uuid4())
            setattr(model_instance, self.attname, value)
            return value
        else:
            return super(models.CharField, self).pre_save(model_instance, add)


class VerificationField(models.CharField) :
    
    def __init__(self, *args, **kwargs):
        kwargs['max_length'] = kwargs.get('max_length', 64 )
        kwargs['blank'] = True
        models.CharField.__init__(self, *args, **kwargs)
    
    def pre_save(self, model_instance, add):
        if add :
            value = '%s_%s' % (str(time()).replace('.', '_'), str(uuid.uuid4())[0:8])
            setattr(model_instance, self.attname, value)
            return value
        else:
            return super(models.CharField, self).pre_save(model_instance, add)

class Base64Field(models.TextField):

    def contribute_to_class(self, cls, name):
        if self.db_column is None:
            self.db_column = name
        self.field_name = name + '_base64'
        super(Base64Field, self).contribute_to_class(cls, self.field_name)
        setattr(cls, name, property(self.get_data, self.set_data))

    def get_data(self, obj):
        return base64.decodestring(getattr(obj, self.field_name))

    def set_data(self, obj, data):
        setattr(obj, self.field_name, base64.encodestring(data))
