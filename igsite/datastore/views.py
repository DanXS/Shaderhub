from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import default_storage
from django.http import HttpResponse, HttpResponseRedirect
from datastore.models import DataFile, DataStore, DataTexture
from datastore.opps import addFile, mergeFile, overwriteFile, deleteFile, getFile, fileDir
from django.template import RequestContext, loader
from django.contrib.sites.models import get_current_site
from forms import TextureForm
from PIL import Image
import os
import json


@csrf_exempt
def uploadjson(request):
    try:
        data=json.loads(request.body)
        if('file_name' in data.keys() and 'secret' in data.keys() and 'data' in data.keys()):
            file_name = data['file_name']
            exists = (len(DataFile.objects.filter(file_name=data['file_name'])) > 0)
            if exists:
                if 'op' in data.keys():
                    if data['op']=='overwrite':
                        print("overwriting "+file_name)
                        overwriteFile(data, DataFile.objects.get(file_name=data['file_name']).uuid)
                    elif data['op']=='merge':
                        print("merging "+file_name)
                        mergeFile(data, DataFile.objects.get(file_name=data['file_name']).uuid)
                    else:
                        raise Exception("File already exists")
            else:
                print("adding "+file_name)
                addFile(data)
            return HttpResponse(json.dumps(data))
        else:
            raise Exception("Error parsing JSON data")
    except Exception, e:
        return HttpResponse('{"Error" : "' + str(e) + '"}', mimetype='application/json')

@csrf_exempt   
def uploadbindings(request):
    try:
        file_uuid = request.POST["file_uuid"]
        exists = (len(DataFile.objects.filter(uuid=file_uuid))> 0)
        if exists:
            data = {'data' : {'shaderBindings' : request.POST['data']}}
            mergeFile(data, file_uuid)
            return HttpResponse('{"OK" : "Bindings Uploaded Successfully"}', mimetype='application/json')
        else:
            return HttpResponse('{"Error" : No file with given UUID exists in the database"}', mimetype='application/json') 
    except Exception, e:
        return HttpResponse('{"Error" : "' + str(e) + '"}', mimetype='application/json')  

def downloadjson(request,file_uuid):
    try:
        result = getFile(file_uuid)
        return HttpResponse(json.dumps(result))
    except Exception, e:
        return HttpResponse('{"Error" : "' + str(e) + '"}', mimetype='application/json')

def getDir(request, user_uuid):
    try:
        dir_list = fileDir(user_uuid)
        template = loader.get_template('datastore/dir.html')
        context = RequestContext(request, {
            'dir_list' : dir_list
        })
        return HttpResponse(template.render(context))
    except Exception, e:
        return HttpResponse('{"Error" : "' + str(e) + '"}', mimetype='application/json')

def info(request, file_uuid):
    template = loader.get_template('datastore/info.html')
    exists = len(DataFile.objects.filter(uuid=file_uuid)) > 0
    if exists:
        f = DataFile.objects.get(uuid=file_uuid)
        data = DataStore.objects.filter(file_uuid=file_uuid).order_by('field')
        textures = DataTexture.objects.filter(file_uuid=file_uuid)
        host = get_current_site(request).domain
        context = RequestContext(request, {
            'file' : f,
            'data' : data,
            'form' : TextureForm,
            'textures': textures,
            'host' : host,
        })
    return HttpResponse(template.render(context))  
    
def uploadimage(request):
    if(request.method == 'POST'):
        form = TextureForm(request.POST, request.FILES)
        if form.is_valid():
            f = form.save(commit=False)
            df_uuid = request.POST["file_uuid"]
            df = DataFile.objects.get(uuid=df_uuid)
            f.file_uuid = df
            f.save()
        return HttpResponseRedirect('info/'+request.POST["file_uuid"])

@csrf_exempt
def uploadthumb(request):
    if(request.method == 'POST'):
        try:
            data = json.loads(request.body)
            file_uuid = data['file_uuid']
            exists = len(DataFile.objects.filter(uuid=file_uuid)) > 0
            if exists:
                imgData = data["data"]
                start = imgData.find("base64")
                if start >= 0:
                    start = start + 7
                    imgData = imgData[start:]
                    loc = default_storage.location
                    pic_file = loc + "/pic_" + file_uuid + ".png"
                    thumb_file = loc + "/thumb_" + file_uuid + ".png"
                    fh = open(pic_file, "wb")
                    fh.write(imgData.decode('base64'))
                    fh.close()
                    size = 340, 256
                    img = Image.open(pic_file)
                    img.thumbnail(size, Image.ANTIALIAS)
                    img.save(thumb_file, "png")
                    return HttpResponse('{"OK" : "Thumbnail Uploaded Successfully"}', mimetype='application/json')
        except KeyError:
            return HttpResponse('{"Error" : "Error Uploading Thumbnail"}', mimetype='application/json')
        return HttpResponse('{"Error" : "Error Uploading Thumbnail"}', mimetype='application/json')
        
 

def uploadtest(request):
    template = loader.get_template('datastore/uploadtest.html')
    context = RequestContext(request, {})
    return HttpResponse(template.render(context))

def uploadimagetest(request):
    template = loader.get_template('datastore/uploadimagetest.html')
    context = RequestContext(request, {})
    return HttpResponse(template.render(context))



