import uuid
from django.http import HttpResponse, HttpResponseRedirect
from django.template import RequestContext, loader
from users.forms import RegistrationForm, ResetPasswordForm, VerifyForm, LoginForm
from django.core.mail import send_mail
from users import models
from time import time
from decimal import Decimal
import igsite.settings


def index(request):
    user_list = models.User.objects.filter(active=True).order_by('first_name').order_by('last_name')
    template = loader.get_template('users/index.html')
    context = RequestContext(request, {
        'user_list': user_list
    })
    return HttpResponse(template.render(context))

def profile(request, user_uuid):
    selected_user = models.User.objects.get(uuid=user_uuid)
    isOnline = len(models.Session.objects.filter(user_uuid=user_uuid)) != 0
    template = loader.get_template('users/profile.html')
    context = RequestContext(request, {
        'selected_user' : selected_user,
        'isOnline' : isOnline
    })
    return HttpResponse(template.render(context))

def register(request):
    if request.method == 'POST':
        form = RegistrationForm(request.POST)
        if form.is_valid():
            already_exists = len(models.User.objects.filter(email = request.POST['email'])) > 0
            if already_exists:
                template = loader.get_template('users/register.html')
                context = RequestContext(request, {'error':'ALREADY_REGISTERED'})
                return HttpResponse(template.render(context))
            else:
                try:
                    form.save()
                    email = request.POST['email']
                    new_user = models.User.objects.get(email = email)
                    send_mail('Hello '+new_user.first_name+', welcome to Ingenious Games', 
                              'Please verify your email address by following this link: '+igsite.settings.WEB_ROOT+"/users/verify/"+new_user.uuid+"/"+new_user.verification_code,
                              igsite.settings.SERVER_EMAIL, [email], fail_silently=False)
                    template = loader.get_template('users/register.html')
                    context = RequestContext(request, {
                        'success' : 'CHECK_EMAIL',
                        'new_user' : new_user,
                    })
                    return HttpResponse(template.render(context))
                except Exception, e:
                    template = loader.get_template('users/register.html')
                    context = RequestContext(request, {'error':str(e)})
                    return HttpResponse(template.render(context)) 
        else:
            template = loader.get_template('users/register.html')
            context = RequestContext(request, {'error':'VALIDATION_ERROR', 'form':form})
            return HttpResponse(template.render(context))
    elif request.method == 'GET':
        template = loader.get_template('users/register.html')
        context = RequestContext(request, {'form' : RegistrationForm})
        return HttpResponse(template.render(context))

def resetpassword(request):
    if request.method == 'POST':
        form = ResetPasswordForm(request.POST)
        if form.is_valid():
            email = request.POST['email']
            exists = len(models.User.objects.filter(email = email)) > 0
            if exists:
                try:
                    password = str(uuid.uuid4())[0:8]
                    current_user = models.User.objects.get(email = email)
                    current_user.password = password
                    current_user.save()
                    send_mail('Hello '+current_user.first_name+', your password has been reset',
                              'Please log in with your new password: '+password+'\nAt: '+igsite.settings.WEB_ROOT+"/users/login",
                              igsite.settings.SERVER_EMAIL, [email], fail_silently=False)
                    template = loader.get_template('users/resetpassword.html')
                    context = RequestContext(request, {'success':'CHECK_EMAIL'})
                    return HttpResponse(template.render(context))
                except Exception, e:
                    template = loader.get_template('users/resetpassword.html')
                    context = RequestContext(request, {'error':str(e)})
                    return HttpResponse(template.render(context))   
            else:
                template = loader.get_template('users/resetpassword.html')
                context = RequestContext(request, {'error':'EMAIL_NOT_FOUND', 'form': form})
                return HttpResponse(template.render(context))
    elif request.method == 'GET':
        template = loader.get_template('users/resetpassword.html')
        context = RequestContext(request, {'form' : ResetPasswordForm})
        return HttpResponse(template.render(context))
    
def login(request):
    if request.method == 'GET':
        template = loader.get_template('users/login.html')
        context = RequestContext(request, {'form' : LoginForm})
        return HttpResponse(template.render(context))
    elif request.method == 'POST':
        try:
            form = LoginForm(request.POST)
            if form.is_valid():
                email = request.POST['email']
                password = request.POST['password']
                login_user = models.User.objects.get(email = email)
                if login_user.password != password:
                    raise Exception
                isloggedon = len(models.Session.objects.filter(user_uuid = login_user.uuid)) > 0
                if isloggedon:
                    session = models.Session.objects.get(user_uuid = login_user.uuid)
                else:
                    session = models.Session()
                    session.user_uuid = login_user
                    session.save()
                request.session['igsession'] = str(session.uuid)
                request.session['iguser'] = str(login_user.uuid)
                return HttpResponseRedirect('/')
            else:
                raise Exception
        except Exception:
            template = loader.get_template('users/login.html')
            context = RequestContext(request, {'error' : 'CREDENTIALS_ERROR', 'form' : LoginForm})
            return HttpResponse(template.render(context))

def logout(request):
    session_id = request.session['igsession']
    if session_id:
        isloggedon = len(models.Session.objects.filter(uuid = session_id)) > 0
        if isloggedon:
            session = models.Session.objects.get(uuid = session_id)
            session.delete()
            del request.session['igsession']
            del request.session['iguser']
    return HttpResponseRedirect('/')
    
def verifyemail(request, user_uuid, verification_code):
    if request.method == 'GET':
        try:
            current_user = models.User.objects.get(uuid = user_uuid)
            if verification_code != current_user.verification_code:
                raise Exception
            timepart = Decimal(verification_code[0:verification_code.rfind('_')].replace('_', '.'))
            time_diff = Decimal(time()) - timepart
            one_day = Decimal(60*60*24)
            if time_diff > one_day:
                raise Exception
            template = loader.get_template('users/verify.html')
            current_user.active = True
            current_user.save()
            context = RequestContext(request, {'success' : 'DONE'})
            return HttpResponse(template.render(context))
            raise Exception
        except Exception:
            template = loader.get_template('users/verify.html')
            context = RequestContext(request, {'error' : 'VERIFY_ERROR', 'form' : VerifyForm})
            return HttpResponse(template.render(context))
        
def verify(request):
    if request.method == 'POST':
        try:
            form = ResetPasswordForm(request.POST)
            if form.is_valid():
                email = request.POST['email']
                password = request.POST['password']
                new_user = models.User.objects.get(email = email)
                if new_user.password != password:
                    raise Exception
                template = loader.get_template('users/verify.html')
                new_user.verification_code = '%s_%s' % (str(time()).replace('.', '_'), str(uuid.uuid4())[0:8])
                new_user.save()
                send_mail('Hello '+new_user.first_name+', welcome to Ingenious Games', 
                              'Please verify your email address by following this link: '+igsite.settings.WEB_ROOT+"/users/verify/"+new_user.uuid+"/"+new_user.verification_code,
                              igsite.settings.SERVER_EMAIL, [email], fail_silently=False)
                context = RequestContext(request, {'success' : 'VERIFY_AGAIN'})
                return HttpResponse(template.render(context))
            else:
                raise Exception
        except:
            template = loader.get_template('users/verify.html')
            context = RequestContext(request, {'error' : 'CREDENTIALS_ERROR', 'form' : VerifyForm})
            return HttpResponse(template.render(context))

