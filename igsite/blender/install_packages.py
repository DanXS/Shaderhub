# to install if you have pip

import pip

def install(package):
    pip.main(['install'], package)

install('requests')

# if already in python path, add system python path to blender path
import sys
# mac
sys.path.append('/Library/Frameworks/Python.framework/Versions/3.3/lib/python3.3/site-packages')
# linux
sys.path.append('/usr/local/lib/python3.3/dist-packages')
