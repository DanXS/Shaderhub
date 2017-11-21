from common.models import UUIDField, VerificationField, models

class User(models.Model):
    uuid = UUIDField(primary_key=True, editable=False)
    secret = UUIDField(editable=False)
    first_name = models.CharField(max_length=64)
    last_name = models.CharField(max_length=64)
    email = models.EmailField(max_length=254)
    password = models.CharField(max_length=64)
    active = models.BooleanField(default=False)
    verification_code = VerificationField(editable=False)

class Session(models.Model):
    uuid = UUIDField(primary_key=True, editable=False)
    user_uuid = models.ForeignKey(User)

