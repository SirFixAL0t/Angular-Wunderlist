# Angular-Wunderlist
Angular wrapper for the Wunderlist API 

==================

Copyright 2017 Fred Enrriquez

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

===================

Table of Content:
* [Disclaimer](#disclaimer)
* [Features](#features)
* [Install](#install) ([Manual](#manual))
* [Usage](#usage)
* [Endpoints](#endpoints)

##<a name="disclaimer"></a> Disclaimer
This is an unofficial wrapper for the Wunderlist API.

##<a name="features"></a> Features
* This unofficial wrapper offers access to the majority of the Wunderlist API endpoints. 
* The wrapper offers a Provider object that allows for easy setup. It uses your Wunderlist issued Auth Token and Client ID
* It offers easy access to all the different verbs available in the API as object functions
* It validates that data as the Wunderlist API would validate it.
* It offers easy access to related data for objects that are related (such as getting notes for tasks, or tasks for lists)
* It uses the standard Angular $http service and returns the promises so you can do whatever you need with the data
 
##<a name="install"></a> Install
 <a name="manual"></a>**Manual**: download latest from [here](hhttps://github.com/SirFixAL0t/Angular-Wunderlist/releases/latest)
 
 Place it in your vendor (or favorite location) and include it into your project. Make sure you include Angular first.
 ```html
 <script src="angular(.min).js"></script>
 <script src="your/vendor/path/angular-wunderlist(.min).js"></script>
 ```

##<a name="usage"></a> Usage
 * Add the module to your app
 ```js
 var myAwesomeApp = angular.module('MyAwesomeApp', [..., 'ngWunderlistModule']);
```

 * Configure the library
 ```js
 myAwesomeApp.config(['ngWunderlistConfiguratorProvider', function(ngWunderlistConfigurator){
        ngWunderlistConfigurator.setClientId(Wunderlist_Client_ID);
        ngWunderlistConfigurator.setAuthToken(Wunderlist_Auth_Token}
    ]);
```

 * Inject the main service into your controller and start using
 ```js
 myAwesomeApp.controller('MyAwesomeController', ['ngWunderlistService', function(ngWunderlistService){
     var lists = ngWunderlistService.getEndpoint('lists');
     lists.getAll().then(function(my_lists){
         console.log(my_lists.data); //Log the array containing my list into the console
     });
 }]);
```

##<a name="endpoints"></a> Endpoints

### FilePreview Endpoint
<a href="https://developer.wunderlist.com/documentation/endpoints/file_preview"> File Preview Endpoint </a>

#### GET

### Folders
<a href="https://developer.wunderlist.com/documentation/endpoints/folder">Folders Endpoint</a>

#### GET 

#### GETALL

#### CREATE 

#### UPDATE

#### DELETE