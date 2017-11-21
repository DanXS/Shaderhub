from datastore.models import DataFile, DataStore
from users.models import User
import numpy as np
import struct



def deleteFile(uuid):
    exists = len(DataFile.objects.filter(uuid=uuid)) > 0
    if(exists):
        f = DataFile.objects.get(uuid=uuid)
        f.delete()

def addFile(data):
    user = User.objects.get(secret=data['secret'])
    newfile = DataFile(user_uuid=user, file_name=data['file_name'], file_info=data['file_info'])
    newfile.save()
    data = data['data']
    for key in data.keys():
        # pack up as floats if type is a list
        if(type(data[key])==list):
            packed = [struct.pack('d', val) for val in data[key]]
            buff = b''.join(packed)
            newdata = DataStore(file_uuid=newfile, field=key, type=0, data=buff)
            newdata.save()
        # save as is if it's a string
        elif(type(data[key]==str)):
            newdata = DataStore(file_uuid=newfile, field=key, type=1, data=data[key])
            newdata.save()
            
def overwriteFile(data, file_uuid):
    olddata = DataStore.objects.filter(file_uuid=file_uuid)
    existingfile = DataFile.objects.get(uuid=file_uuid)
    olddata.delete()
    data = data['data']
    for key in data.keys():
        # pack up as floats if type is a list
        if(type(data[key])==list):
            packed = [struct.pack('d', val) for val in data[key]]
            buff = b''.join(packed)
            newdata = DataStore(file_uuid=existingfile, field=key, type=0, data=buff)
            newdata.save()
        # save as is if it's a string
        elif(type(data[key]==str)):
            newdata = DataStore(file_uuid=existingfile, field=key, type=1, data=data[key])
            newdata.save()
    
def mergeFile(data, file_uuid):
    existingfile = DataFile.objects.get(uuid=file_uuid)
    data = data['data']
    for key in data.keys():
        keyexists = (len(DataStore.objects.filter(file_uuid=existingfile).filter(field=key)) > 0)
        # pack up as floats if type is a list
        if(type(data[key])==list):
            packed = [struct.pack('d', val) for val in data[key]]
            buff = b''.join(packed)
            if(not(keyexists)):
                newdata = DataStore(file_uuid=existingfile, field=key, type=0, data=buff)
            else:
                olddata = DataStore.objects.filter(file_uuid=existingfile).get(field=key)
                newdata = olddata
                newdata.type=0
                newdata.data=buff
            newdata.save(force_update=keyexists)
        # save as is if it's a string
        elif(type(data[key]==str)):
            if(not(keyexists)):
                newdata = DataStore(file_uuid=existingfile, field=key, type=1, data=data[key])
            else:
                olddata = DataStore.objects.filter(file_uuid=existingfile).get(field=key)
                newdata = olddata
                newdata.type=1
                newdata.data=data[key]
            newdata.save(force_update=keyexists)

def getFile(uuid):
    exists = len(DataFile.objects.filter(uuid=uuid)) > 0;
    if exists:
        data = DataStore.objects.filter(file_uuid=uuid)
        rows = {}
        for item in data:
            if item.type==0:
                rows[item.field]=np.frombuffer(item.data, dtype=np.double).tolist()
            elif item.type==1:
                rows[item.field] = item.data
        return rows
    else:
        raise Exception("File not found")




def fileDir(user_uuid):
    datafiles = DataFile.objects.filter(user_uuid=user_uuid).order_by('file_name')
    results = []
    for datafile in datafiles:
        result = {}
        result['file_name'] = datafile.file_name
        result['uuid'] = datafile.uuid
        result['file_info'] = datafile.file_info
        results.append(result)
    return results