from django.http import HttpResponse
from django.template import RequestContext, loader
from datastore.models import DataFile, DataStore, DataTexture
from datastore.opps import getFile
import json

def index(request, file_uuid):
    try:
        template = loader.get_template('configure/index.html')
        exists = len(DataFile.objects.filter(uuid=file_uuid)) > 0
        data = getFile(file_uuid)
        if exists:
            f = DataFile.objects.get(uuid=file_uuid)
            mats = DataStore.objects.filter(file_uuid=file_uuid).filter(field__contains='Matrix').order_by('field')
            shaders = DataStore.objects.filter(file_uuid=file_uuid).filter(field__contains='Shader').order_by('field')
            normals = DataStore.objects.filter(file_uuid=file_uuid).filter(field__contains='normals').order_by('field')
            verts = DataStore.objects.filter(file_uuid=file_uuid).filter(field__contains='vertices').order_by('field')
            uvs = DataStore.objects.filter(file_uuid=file_uuid).filter(field__contains='uvs').order_by('field')
            textures = DataTexture.objects.filter(file_uuid=file_uuid)
            context = RequestContext(request, {
                'file' : f,
                'matrices': mats,
                'normals' : normals,
                'vertices' : verts,
                'uvs' : uvs,
                'shaders' : shaders,
                'textures' : textures,
                'json' : json.dumps(data)
            })
    except Exception, e:
        context = RequestContext(request, {'Error': str(e)})
    return HttpResponse(template.render(context))

