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

##<a name="disclaimer"></a> Disclaimer
This is an unofficial wrapper for the Wunderlist API.

##<a name="features"></a> Features
* This unofficial wrapper offers access to the majority of the Wunderlist API endpoints. 
* The wrapper offers a Provider object that allows for easy setup. It uses your Wunderlist issued Auth Token and Client ID
* It offers easy access to all the different verbs available in the API as object functions
* It validates that data as the Wunderlist API would validate it.
* It offers easy access to related data for objects that are related (such as getting notes for tasks, or tasks for lists)
* It uses the standard Angular $http service and returns the promises so you can do whatever you need with the data
* All set() functions are chainable, to reduce the steps and footprint of your code
* It exposes the raw promise without modification to give you access to all the data you would have if you call the API yourself.

##<a name="install"></a> Install
 <a name="manual"></a>**Manual**: download latest from [here](hhttps://github.com/SirFixAL0t/Angular-Wunderlist/releases/latest)
 
 Place it in your vendor (or favorite location) and include it into your project. Make sure you include Angular first.
 ```html
 <script src="angular(.min).js"></script>
 <script src="your/vendor/path/angular-wunderlist(.min).js"></script>
 ```

##<a name="usage"></a> Usage
 ### Add the module to your app
 ```js
 var myAwesomeApp = angular.module('MyAwesomeApp', [..., 'ngWunderlistModule']);
```

 ### Configure the library
 ```js
 myAwesomeApp.config(['ngWunderlistConfiguratorProvider', function(ngWunderlistConfigurator){
        ngWunderlistConfigurator.setClientId(Wunderlist_Client_ID);
        ngWunderlistConfigurator.setAuthToken(Wunderlist_Auth_Token}
    ]);
```

 ### Inject the main service into your controller and start using
 ```js 
 myAwesomeApp.controller('MyAwesomeController', ['ngWunderlistService', function(ngWunderlistService){
     var lists = ngWunderlistService.getEndpoint('lists');
     lists.getAll().then(function(my_lists){
         console.log(my_lists.data); //Log the array containing my list into the console
     });
 }]);
 ```

### Available endpoints:

   All endpoints available in the Wunderlist API are enabled except: 
   * File Preview (https://developer.wunderlist.com/documentation/endpoints/file_preview) 
         **Note**: This one is implemented but untested.
   * Upload (https://developer.wunderlist.com/documentation/endpoints/upload)
   * File (https://developer.wunderlist.com/documentation/endpoints/file)
   * Avatar (https://developer.wunderlist.com/documentation/endpoints/avatar)
         **Note**: This one is implemented and tested, but is useless as the API redirects the user to a different site and the redirection is blocked by angular.
   * Webhooks (https://developer.wunderlist.com/documentation/endpoints/webhooks)
   
* How to determine the name of your endpoint?
    
    Endpoints are named after the URL they point to. For example, the **lists** endpoint points to 
    a.wunderlist.com/api/v1/**lists**.
    All of the endpoints follow this convention, except the Positions. 
    
    The positions endpoint was divided in three. This was done so the code looks similar to other endpoints. 
    You have three available endpoints:
    * task_positions
    * subtask_positions
    * list_positions
    
* Special functions such as folder_revisions

    If the endpoint offers more functionality, a special function was created for it for easy of use
    
    For example, the folder_revisions is available as **getFolderRevisions** of the **folders** endpoint.
    
    A list of the special functions is found below
    
    * Folders: getFolderRevisions()
    * Tasks: notes()
    * Lists: tasks()
    
* Getting Related data (such as lists tasks)

    For the APIs that are related (such as notes for tasks and tasks for lists), you can do this easily by calling the special functions lists.task() or tasks.notes()
     
    Please keep in mind that this functions will require you to set a specific ID for tasks and lists before you can use them. You can do it as follows
    ```js
    //You can do it in one step
    var lists = ngWunderlistService.getEndpoint('lists', 12345);
    //Or you can do it in two steps
    //Get the endpoint
    lists = ngWunderlistService.getEndpoint('lists');
    //Set the ID
    lists.setId(12345);
    //now we can get the tasks
    var tasks = lists.tasks();
    //with the tasks object now we have access to our standard functions
    tasks.getAll().then(function(list_tasks){
      console.log(list_tasks); //this will log all your tasks for your list
      });
    ```
    If you want to do manually, you can do the following
    ```js
    var tasks = ngWunderlistService.getEndpoint('tasks');
    tasks.setListId(9999);
    tasks.getAll().then(function(list_tasks){
          console.log(list_tasks); //this will log all your tasks for your list
          });
    ```
###Executing a GET request
Executing get requests can be interpreted in two ways. 
* [Getting one record (appending the ID to the query string)](#onerecord)
* [Getting all records for a specific endpoint](#allrecords)
####<a name="onerecord"></a> Getting one record

To get one record, we first need to tell the system which record we want. There are two ways of doing this: 

```js
//Example using the lists endpoint
var lists = ngWunderlistService.getEndpoint('lists', 12345);
```
12345 is the ID of the record you want to retrieve. This will pre populate the ID in the API for you.

If you want to do this manually, you can do it as follows:
```js
var lists = ngWunderlistService.getEndpoint('lists');
lists.setId(12345);
```

Whichever way you do it, you will end up with your endpoint object ready to be called. 

```js
lists.get().then(function(record){
    //record is the JSON object that was returned from the API.
    var title = lists.data.title;
    var responseStatus = lists.status;
    var revision = lists.data.revision;
});
```

####<a name="allrecords"></a> Getting all records for a specific endpoint

To get all records for a given API, you can simply call the getAll() function. This returns an array with all the available data points in your endpoint
```js
lists.getAll().then(function(all_lists){
    //the all_lists.data object contains the array of lists
    var length = all_lists.data.length;
    var index;
    
    for(index=0; index < length; index++){
        var title = all_lists.data[index].title;
    }
});
```

###Executing a POST request

Post requests are called "Create" in the ngWunderlist library. To create an element, you need to pass the create() function the right data with the right format. 

To check what data you need to send, please check the Wunderlist API. 

For example, let's create a new folder

```js
var folder = ngWunderlistService.getEndpoint('folders');
//Assuming the array list_ids is valid. 
folder.create({title: 'Family Folder', list_ids: [1,2,3,4]}).then(function(created){
    alert('Folder created!');
});
```

**Note:** If your API needs parameters appended to the URL (suchs as /tasks?list_id=1234) you can call send the **setParams()** function an object indicating what parameters you want (and their values) and they will be parsed automatically.
```js
tasks.setParams({list_id: 12345}).create({...});
```

The example above will result in a POST request to **a.wunderlist.com/api/v1/tasks?list_id=12345** and the body of the post is the object sent to the **create()** function.

###Executing a PATCH request

Patch requests are called "Updates" in the ngWunderlist library. To update an element, you need the proper data, but you also need the proper revision number. To know what data you need to send, please check the Wunderlist Documentation for the desired API

Revisions are used by wunderlist to ensure that the updated elements is in an updated state. If your revision does not match the revision of the item on the server, Wunderlist will reject your request to avoid sync problems

Let's use the previous example of the folder creation, but this time, let's update our folder 

```js
var folder = ngWunderlistService.getEndpoint('folders', 12345);
//Or you can do var folder = ngWunderlistService.getEndpoint('folders').setId(12345);
folder.get().then(function(my_folder){
    folder.update({title: 'Not Family Anymore, Now Friends list too!', revision: my_folder.data.revision});
});
```

###Executing a DELETE request 

To execute a delete request, you just need a valid ID and the latest revision of your object. **delete()** only takes an object with the revision: 
```js
delete({revision: your_last_revision});
```

You can simply use what you learn on the create and update methods to delete an object: 

```js
var folder = ngWunderlistService.getEndpoint('folders', 12345);
folder.get().then(function(my_folder){
    folder.delete({revision: my_folder.data.revision});
});
```