### 0.0.58

New features:

  - Set Manufacturer, Model and SerialNumber to address issue with Eve App v4.2+ (https://github.com/homebridge/homebridge/issues/2503)

### 0.0.57

New features:

  - Added subjectAltName to generated SSL cert.
  - Support SSL certificate update if code changes by using a version number.
  - Support own SSL certificates using properties httpsKeyFile and httpsCertFile.

### 0.0.56

Bugfix:

  - Webhooks didn't work anymore. Please update.

### 0.0.55

New features:

  - You can now secure the webhook server using a self signed ssl certificate (beta state).

### 0.0.54

Bugfix:

  - Added ReadMe about cache directory.

### 0.0.52

New features:

  - Added auto release for contact sensor. Added auto release time to contact, motion, and occupancy sensor.

### 0.0.51

Bugfix:

  - Return valid Json in webhook (thanks to mshulman)

### 0.0.50

New features:

  - You can now set body, form and custom headers for switches, pushbuttons, lights, thermostats, garage door openers, window coverings, lock mechanism & security system. (by EddyK69)

### 0.0.49

New features:

  - You can now set custom headers for switches.
  - You can now set body and custom headers for outlets.

### 0.0.48

Bugfix:

  - Fixed security system spinning wheel in homekit after action.

### 0.0.47

Bugfix:

  - Fixed garage door spinning wheel visiable in homekit after action.

### 0.0.46

New features:

  - Added window coverings. (thanks to kaowiec)

### 0.0.45

Bugfix:

  - Fixed lock mechanism.

### 0.0.44

Bugfix:

  - Now a temperature sensor can handle negative values.

### 0.0.43

New features:

  - Added light sensor. (thanks to gorootde)

Bugfix:

  - Fixed auto release for motion and occupancy sensor. (thanks to kovalev-sergey)

### 0.0.42

New features:

  - Updated dependency to request.

### 0.0.41

New features:

  - Added lock mechanism. (thanks to kaowiec).
  
### 0.0.40

New features:

  - Added stateless switches. (thanks to BetoRn).
  - Added request body support for POST and PUT request for switches. (thanks to BetoRn).
  - Added auto release for motion and occupancy sensor. (thanks to BetoRn).

### 0.0.39

New features:

  - Added Garage Door Opener accessory. (thanks to FlyingLemming).

### 0.0.38

New features:

  - Added a new accessory to support security system. (thanks to jcbriones).

## 0.0.37

Bugfix:

  - Listen to Ipv4.

### 0.0.36

New features:

  - Added air quality as sensor (thanks to tansuka).

### 0.0.35

New features:

  - Added http authentication if desired (thanks to paolotremadio).

### 0.0.34

Bugfix:

  - Last fix wasn't correct. Removed cache handling for push button as state is always false.
  
### 0.0.33

Bugfix:

  - Fix issue where push button doesn't change its cache state back to false.

### 0.0.32

New features:

  - Added support for outlet.

### 0.0.31

New features:

  - Added support for temperature, humidity and thermostats (thanks to iEns).

### 0.0.30

New features:

  - Support setting the request method. Only GET and PUT are tested. Default is still GET.

# 0.0.29

Bugfix:

  - Use correct type to update smoke sensor state via webhook.
  - Switch back pushbutton correctly using timeout if it was updated to state = true via webhook.

## 0.0.28

Bugfix:

  - Now uses updateValue instead of setValue to update iOS correctly.

## 0.0.27

New features:

  - Webhooks no longer call the on/off/push url as in most cases the webhook gets called from an external smart home system that already knows the new state as it send the webhook call.

## 0.0.26

New features:

  - Added light. Currently just on/off is supported.
  
## 0.0.25

Bugfix:

  - Now Uses the Characteristic's Enumeration for Value Reporting.
  - Now a webhook call only triggers homekit change if the state is not the same as in the cache. This fixed an issue where a homekit change was triggered twice, once by homekit and once by the resulting webhook call of an external system that also reacts on changes.

## 0.0.24

Bugfix:

  - Push buttons without url do now switch state back correctly.

## 0.0.23

New features:

  - Added push buttons. The button will be released automatically.

## 0.0.22

Bugfix:

  - Switches without on or off url do now switch state correctly.

## 0.0.21

New features:

  - You can now call the webhook URL without the state parameter to get the current state of the accessory.

## 0.0.20

New features:

  - Added occupancy sensor (thanks to wr).

## 0.0.19

Bugfix:

  - Removed some logging.

## 0.0.18

Bugfix:

  - Added context to setValue call.

## 0.0.17

Bugfix:

  - Fixed infinite loop for switches.

## 0.0.16

Bugfix:

  - Fixed switches one more time.

## 0.0.15

Bugfix:

  - Fixed switches.

## 0.0.14

New features:

  - Added switch.

## 0.0.13

New features:

  - Added smoke sensor.

## 0.0.12

Bugfix:

  - Fixed readme.

## 0.0.11

Bugfix:

  - Fixed state values.

## 0.0.10

Bugfix:

  - Fixed context.

## 0.0.9

Bugfix:

  - Fixed variable.

## 0.0.8

Bugfix:

  - Implemented getState.

## 0.0.7

Bugfix:

  - Added missing dot.

## 0.0.6

New features:

  - Added some logging.

## 0.0.5

Bugfix:

  - Fix another copy and paste error.

## 0.0.4

Bugfix:

  - Fix copy and paste error.

## 0.0.3

Bugfix:

  - Fix context.

## 0.0.2

Bugfix:

  - Removed unexpected ';'.

## 0.0.1

Initial release version.