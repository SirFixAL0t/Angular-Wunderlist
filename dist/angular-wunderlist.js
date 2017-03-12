(function (angular) {
    'use strict';
    var ngWunderlistModule = angular.module('ngWunderlistModule', []);

    /**
     * Wunderlist's base API
     */
    var BASE_URL = 'https://a.wunderlist.com/api/v1/';
    /**
     * The supported list of endpoints. Taken from developer.wunderlist.com
     */
    var _allowedEndpoints = 'avatar,files,previews,folders,lists,memberships,notes,list_positions,task_positions,subtask_positions,reminders,root,subtasks,tasks,task_comments,uploads,user,webhooks'.split(',');

    var Methods = {
        GET: 1,
        GETALL: 2,
        CREATE: 4,
        UPDATE: 8,
        DELETE: 16
    };

    var Scenarios = {
        CREATE: 1,
        UPDATE: 2
    };

    var validScenarios = Scenarios.CREATE | Scenarios.UPDATE;

    /**
     * Our main service. This acts like a factory of endpoints.
     * @requires Object ngWunderlistEndpoint the ngWunderlist service that contains all the definition for the current wunderlist API
     * @example ngWunderlistService.getEndpoint('lists'); This will return a new Endpoint Object for the lists API
     * @returns Service returns an instance of the current service, with the getEndpoint function available for use as endpoint factory
     */
    var ngWunderlistService = ['ngWunderlistConfigurator', 'ngWunderlistEndpointService', function (ngWunderlistConfigurator, ngWunderlistEndpoint) {
        if (!ngWunderlistConfigurator.getAuthToken() || !ngWunderlistConfigurator.getClientId()) {
            throw new Error('Token and Client ID are needed for the ngWunderlist module to work');
        }

        var service = this;

        var capitalize = function (string) {
            return string.toString().charAt(0).toUpperCase() + string.toString().slice(1);
        };

        var instances = {};

        service.getEndpoint = function (name, id) {
            if (_allowedEndpoints.indexOf(name) === -1) throw new Error('Cannot get endpoint ' + name + '. Endpoint not implemented.');

            try {
                var _id = id || false;
                var endpointName = 'Endpoint_' + capitalize(name);
                if (!instances.hasOwnProperty(endpointName)) {
                    instances[endpointName] = new ngWunderlistEndpoint[endpointName](name);
                }
                return instances[endpointName].setId(_id);
            } catch (e) {
                console.error(e);
            }
        };

        return service;
    }];
    /**
     * @name NgWunderlistEndpointService
     * @description This service provides the backbone structure and functions for an API endpoint in the wunderlist API. All objects extend the WunderlistEndpoint
     *              Some object go outside of the main methods and expose object specific APIs, those are also covered. Look at the folders API for more details,
     *
     * @requires ngWunderlistValidation This is a validation service provided by this library that centralizes the validation logic and classes.
     * @requires $http Standard angular HTTP service. This is used to perform the API calls to the wunderlist site
     * @requires ngWunderlistConfigurator Library's provider. Used to configure the wunderlist API with Client ID and Access Token.
     *
     * @property {Array} validFields The list of fields accepted by any given endpoint. This is used for validation of data
     * @property {String} endpoint The name of the endpoint this object points to. Endpoints are API methods available in the Wunderlist API
     * @property {Number} [identifier=false] The ID of the element represented in this endpoint object. Used for get(), update(), and delete() API calls
     * @property {Object} fieldValidation A Hash containing all the fields that require validation and their validation strategies for create and update methods. Expressed in {'scenario': {'field': {'allowsEmpty': true, 'strategy': validationStrategy}, 'otherField': {'strategy': validationStrategy}};
     * @property {Object} [endpointData=[]] This is a hash containing all the field names and values to be used in the API. Used to create and update endpoint objects
     * @property {Number} [availableMethods = Methods.CREATE | Methods.UPDATE | Methods.CREATE | Methods.GET | Methods.GETALL ] A binary representation of the available methods or verbs that are available for each endpoint. Some APIs do not expose delete methods and we need to keep them from being used and generate errors
     * @property {Object} params A hash of parameters to be used in the URL generation, such as list_id or task_id, or completed.
     * @property {Object} config The API configuration object containing the clientID and the Authorization key to perform authenticated API calls.
     * @property {Number} list_id A list ID pointing to a related object. This is used for tasks or notes
     * @property {Number} task_id A task ID pointing to a related object. This is used for positions, comments, or reminders.
     *
     * @returns Object returns an object with the exposed object APIs ready to use the get(), getAll(), create(), update(), and delete() methods.
     */
    var ngWunderlistEndpointService = ['ngWunderlistValidation', '$http', 'ngWunderlistConfigurator', function (ngWVal, $http, configurator) {

        var WunderlistEndpoint = function (name) {

            this.validFields = [];
            this.endpoint = name;
            this.identifier = false;
            this.fieldValidation = {};
            this.endpointData = {};
            this.availableMethods = Methods.CREATE | Methods.DELETE | Methods.UPDATE | Methods.GET | Methods.GETALL;
            this.endpointParams = [];
            this.config = configurator.getConfig();
            this.list_id = undefined;
            this.task_id = undefined;

            this.getConfig = function () {
                return this.config;
            };

            this.setId = function (id) {
                this.identifier = id;
                return this;
            };

            this.getId = function () {
                if (this.identifier > 0) {
                    return this.identifier;
                }
                throw new Error("Invalid identifier");
            };

            this.setData = function (data) {
                this.endpointData = data;
                return this;
            };

            this.getData = function () {
                return this.endpointData;
            };

            this.setParams = function (params) {
                this.endpointParams = params;
                return this;
            };

            this.getParams = function () {
                return this.endpointParams;
            };

            this.setEndpoint = function (endpoint) {
                this.endpoint = endpoint;
                return this;
            };

            this.getEndpoint = function () {
                return this.endpoint;
            };

            this.getListId = function () {
                var _id = this.list_id || this.getParams().list_id;
                if (!_id) {
                    throw new Error('List_id is not defined');
                }
                new ngWVal.IDNumericValidation().setProperty('list_id').setValue(_id).validate();
                return _id;
            };

            this.setListId = function (id) {
                this.list_id = id;
                return this;
            };

            this.getTaskId = function () {
                var _tid = this.task_id || this.getParams().task_id;
                if (!_tid) {
                    throw new Error('Invalid task ID');
                }
                new ngWVal.IDNumericValidation().setProperty('list_id').setValue(_tid).validate();
                return _tid;
            };

            this.setTaskId = function (id) {
                this.task_id = id;
                return this;
            };

            /**
             * buildQuery parses the parameters, appends them to the URL and returns the build url with the proper query string
             * @param url
             * @param params
             * @returns {string} the build query string
             */
            this.buildQuery = function (url, params) {
                var str = url + "?";
                var humanParams = [];
                for (var key in params) {
                    if (params.hasOwnProperty(key)) {
                        humanParams.push(key + '=' + params[key]);
                    }
                }
                return str + humanParams.join('&');
            };

            this.methodEnabled = function (method) {
                if ((this.getAvailableMethods() & method) !== method) {
                    throw new Error('Method not available for endpoint ' + this.getEndpoint());
                }
            };

            this.getAvailableMethods = function () {
                return this.availableMethods;
            };

            this.setAvailableMethods = function (methods) {
                this.availableMethods = methods;
                return this;
            };

            this.getValidFields = function () {
                return this.validFields;
            };

            this.setValidFields = function (fields) {
                this.validFields = fields;
                return this;
            };

            this.getFieldValidation = function () {
                return this.fieldValidation;
            };

            this.setFieldValidation = function (validations) {
                this.fieldValidation = validations;
                return this;
            };

            this.validateScenario = function (name) {
                if ((validScenarios & name) !== name) {
                    throw new Error('Scenario ' + name + ' is not valid. Valid scenarios are create and update.');
                }
            };

            /**
             * Validate: This function centralizes the object validation depending on the scenario. It prepares
             * the data if it needs to (such as populating data from parameters, etc)
             * It iterates through the fields that are expected for each scenario, validates their content based on
             * validation strategies defined, and triggers the post validation process.
             * This function is only called in valid scenarios such as create or update.
             * @param scenario {Number} The scenario to validate
             * @throws Error Several errors can be thrown by this function.
             *  If the endpoint has no fields,
             *  if the data is empty
             *  if a field is required but is not populated
             *  if a field is sent but not specified in the list of fields.
             *  if a method is called that the object does not expose.
             */
            this.validate = function (scenario) {
                this.prepare(scenario);
                this.validateScenario(scenario);

                var validFields = this.getValidFields();

                if (this.getValidFields().length <= 0) {
                    throw new Error("The endpoint has no defined valid fields");
                }

                var _data = this.getData();
                if (Object.keys(_data).length <= 0) {
                    throw new Error('Data cannot be empty');
                }

                for (var field_property in _data) {
                    if (!_data.hasOwnProperty(field_property)) {
                        throw new Error('Invalid field ' + field_property + '. List of available fields are ' + validFields.join(', '));
                    }
                }

                var fieldValidation = this.getFieldValidation();
                var scenarioFieldValidation = fieldValidation[scenario];

                if (fieldValidation.length <= 0 || scenarioFieldValidation.length < 0) {
                    throw new Error("Field validation is missing");
                }

                for (var property in scenarioFieldValidation) {
                    if (!scenarioFieldValidation.hasOwnProperty(property)) {
                        throw new Error('SYSTEM_ERROR field validation for scenario cannot be retrieved');
                    }
                    var validationObject = scenarioFieldValidation[property];
                    if (!validationObject.hasOwnProperty('strategy')) {
                        throw new Error('SYSTEM_ERROR field validation does not contain a strategy');
                    }
                    var emptyAllowed = validationObject.allowEmpty || false;
                    new (validationObject.strategy)().setValue(_data[property]).setProperty(property).validate(emptyAllowed);
                }

                this.postValidation(scenario);
            };

            /**
             * Execute: This function prepares the URL, validates the parameters needed for the endpoint if needed
             * It then builds the URL based on a pre defined set of rules for each 'method' and triggers the
             * necessary $http functions.
             * @param {String} url
             * @param {Number} method
             *
             * @returns Promise from the $http method executed.
             */
            this.execute = function (url, method) {
                var methods = Methods.GET | Methods.GETALL | Methods.CREATE | Methods.UPDATE | Methods.DELETE;
                if ((methods & method) !== method) {
                    throw new Error('SYSTEM_ERROR - Invalid method ' + method);
                }

                var _url = BASE_URL + url;

                this.validateParams(method);

                switch (method) {
                    case Methods.GET:
                        return this.buildGetUrl(_url);
                    case Methods.GETALL:
                        return this.buildGetAllUrl(_url);
                    case Methods.CREATE:
                        return this.buildPostUrl(_url);
                    case Methods.UPDATE:
                        return this.buildPatchUrl(_url);
                    case Methods.DELETE:
                        return this.buildDeleteUrl(_url);
                }
            };

            /**
             * Get List or Task: Helper method to get either the task_id or list_id from the set parameters.
             * @returns {Object} returns an object containing either the task_id or the params_id
             * @throws Error if neither the task_id or list_id are defined.
             */
            this.getListOrTask = function () {
                var _params = this.getParams();
                if (!_params.task_id && !_params.list_id) {
                    throw new Error('Task ID or List ID is required');
                }
                if (_params.task_id) {
                    return {'task_id': _params.task_id};
                }
                if (_params.list_id) {
                    return {'list_id': _params.list_id};
                }
            }
        };

        var service = this;

        /**
         * getAll: a helper method to execute get request that return a list of elements instead of one.
         * @returns {Object} Promise
         */
        WunderlistEndpoint.prototype.getAll = function () {
            this.methodEnabled(Methods.GETALL);
            return this.execute(this.getEndpoint(), Methods.GETALL)
        };

        WunderlistEndpoint.prototype.get = function (id) {
            this.methodEnabled(Methods.GET);
            if (id) {
                this.setId(id);
            }
            return this.execute(this.getEndpoint() + '/' + this.getId(), Methods.GET);
        };

        WunderlistEndpoint.prototype.create = function (data) {
            this.methodEnabled(Methods.CREATE);

            if (data) {
                this.setData(data);
            }
            var _data = this.getData();
            if (_data.length <= 0) {
                throw new Error('Cannot create a new child for ' + this.getEndpoint() + ' without data');
            }


            this.validate(Scenarios.CREATE);
            return this.execute(this.getEndpoint(), Methods.CREATE);
        };

        WunderlistEndpoint.prototype.update = function (data) {
            this.methodEnabled(Methods.UPDATE);

            if (data) {
                this.setData(data);
            }
            var _data = this.getData();
            if (_data.length <= 0) {
                throw new Error('Cannot update child of ' + this.getEndpoint() + ' without data');
            }

            this.validate(Scenarios.UPDATE);
            return this.execute(this.getEndpoint() + '/' + this.getId(), Methods.UPDATE);
        };

        WunderlistEndpoint.prototype.delete = function (data) {
            this.methodEnabled(Methods.DELETE);

            if (data) {
                this.setData(data);
            }
            var _data = this.getData();

            if (!_data.revision || Object.keys(_data).length != 1) {
                throw new Error('Revision is the only required element to delete a ' + this.getEndpoint() + ' element');
            }
            return this.execute(this.buildQuery(this.getEndpoint() + '/' + this.getId(), _data), Methods.DELETE);
        };

        WunderlistEndpoint.prototype.buildGetUrl = function (url) {
            return $http.get(url, this.getConfig());
        };

        WunderlistEndpoint.prototype.buildGetAllUrl = function (url) {
            return this.buildGetUrl(url);
        };

        WunderlistEndpoint.prototype.buildPostUrl = function (url) {
            return $http.post(url, this.getData(), this.getConfig());
        };

        WunderlistEndpoint.prototype.buildPatchUrl = function (url) {
            return $http.patch(url, this.getData(), this.getConfig());
        };

        WunderlistEndpoint.prototype.buildDeleteUrl = function (url) {
            return $http.delete(url, this.getConfig());
        };

        /**
         * postValidation: default implementation of the postValidation.
         * This function can assist an endpoint to configure its own parameters or data after the validation
         * has been performed. For example, if the data of the element contains data that can be used in the parameters
         * the endpoint can use this function (overriding it) to use the data and populate the parameters.
         * @example postValidation can also perform endpoint specific validation after the main validation was performed
         * @param scenario
         */
        WunderlistEndpoint.prototype.postValidation = function (scenario) {
        };

        /**
         * prepare: default implementation of the prepare function. This function is executed before the validation
         * is executed, and serves the endpoints as a way to prepare the data before is validated. For example,
         * it can get the task_id from the parameters, and it can set it as data if needed.
         * @param scenario
         */
        WunderlistEndpoint.prototype.prepare = function (scenario) {
        };

        /**
         * validateParams: default implementation of the validateParams function. This function
         * allows the endpoints to validate the parameters that are used for the API calls. For example
         * to create a Note, a task_id or list_id is necessary.
         * @param method
         */
        WunderlistEndpoint.prototype.validateParams = function (method) {
        };

        /**
         * @description File Preview API endpoint
         * @link https://developer.wunderlist.com/documentation/endpoints/file_preview
         *
         * @returns Function returns a function representing the endpoint object for the FilePreview API
         */
        var Endpoint_Filepreview = function () {
            WunderlistEndpoint.call(this, 'previews');
            this.setAvailableMethods(Methods.GET);
        };

        /**
         * @description Folders API endpoint
         * @link https://developer.wunderlist.com/documentation/endpoints/folder
         * @param {String} name
         *
         * @returns Function returns a function representing the endpoint object for the Folders API
         */
        var Endpoint_Folders = function (name) {
            WunderlistEndpoint.call(this, name);
            this.setValidFields('title,revision,list_ids'.split(','));
            var validations = {};
            validations[Scenarios.CREATE] = {
                'title': {'strategy': ngWVal.StringValidation},
                'revision': {'strategy': ngWVal.EmptyRequired},
                'list_ids': {'strategy': ngWVal.ArrayValidation}
            };
            validations[Scenarios.UPDATE] = {
                'title': {'strategy': ngWVal.StringValidation},
                'revision': {'strategy': ngWVal.IDNumericValidation},
                'list_ids': {'allowEmpty': true, 'strategy': ngWVal.ArrayValidation}
            };
            this.setFieldValidation(validations);
            this.getFolderRevisions = function () {
                return this.execute('folder_revisions', Methods.GET);
            };
        };

        /**
         * @description Users API endpoint
         * @link https://developer.wunderlist.com/documentation/endpoints/user
         * @param {String} name
         *
         * @returns Function returns a function representing the endpoint object for the User API
         */
        var Endpoint_User = function (name) {
            WunderlistEndpoint.call(this, name);
            this.setAvailableMethods(Methods.GET | Methods.GETALL);
        };

        /**
         * @description Lists API endpoint
         * @link https://developer.wunderlist.com/documentation/endpoints/list
         * @param {String} name
         *
         * @returns Function returns a function representing the endpoint object for the List API
         */
        var Endpoint_Lists = function (name) {
            WunderlistEndpoint.call(this, name);
            this.setValidFields('title,revision'.split(','));
            var validations = {};
            validations[Scenarios.CREATE] = {
                'title': {'strategy': ngWVal.StringValidation},
                'revision': {'strategy': ngWVal.EmptyRequired}
            };
            validations[Scenarios.UPDATE] = {
                'title': {'strategy': ngWVal.StringValidation},
                'revision': {'strategy': ngWVal.IDNumericValidation}
            };
            this.setFieldValidation(validations);
            this.tasks = function () {
                var _id = false;
                try {
                    _id = this.getId();
                } catch (e) {
                    throw new Error('In order to get a task for lists, the list id has to be specified');
                }
                return new Endpoint_Tasks('tasks').setParams({'list_id': _id});
            };
        };

        /**
         * @description Memberships API endpoint
         * @link https://developer.wunderlist.com/documentation/endpoints/membership
         * @param {String} name
         *
         * @returns Function returns a function representing the endpoint object for the Memberships API
         */
        var Endpoint_Memberships = function (name) {
            WunderlistEndpoint.call(this, name);
            this.setAvailableMethods(Methods.GETALL | Methods.CREATE | Methods.UPDATE | Methods.DELETE);
            this.setValidFields('list_id,user_id,email,muted,state,revision'.split(','));
            var validations = {};
            validations[Scenarios.CREATE] = {
                'list_id': {'strategy': ngWVal.IDNumericValidation},
                'user_id': {'allowEmpty': true, 'strategy': ngWVal.IDNumericValidation},
                'email': {'allowEmpty': true, 'strategy': ngWVal.EmailValidation},
                'revision': {'strategy': ngWVal.EmptyRequired},
                'muted': {'allowEmpty': true, 'strategy': ngWVal.BooleanValidation},
                'state': {'strategy': ngWVal.EmptyRequired}
            };
            validations[Scenarios.UPDATE] = {
                'revision': {'strategy': ngWVal.IDNumericValidation},
                'muted': {'allowEmpty': true, 'strategy': ngWVal.BooleanValidation},
                'state': {'strategy': ngWVal.StringValidation},
                'list_id': {'strategy': ngWVal.EmptyRequired},
                'user_id': {'strategy': ngWVal.EmptyRequired},
                'email': {'strategy': ngWVal.EmptyRequired}
            };
            this.setFieldValidation(validations);
        };

        /**
         * @description Tasks API endpoint
         * @link https://developer.wunderlist.com/documentation/endpoints/task
         * @param {String} name
         *
         * @returns Function returns a function representing the endpoint object for the Tasks API
         */
        var Endpoint_Tasks = function (name) {
            WunderlistEndpoint.call(this, name);
            this.setValidFields('list_id,title,assignee_id,completed,recurrence_type,recurrent_count,due_date,starred,revision,remove'.split(','));
            var validations = {};
            validations[Scenarios.CREATE] = {
                'list_id': {'strategy': ngWVal.IDNumericValidation},
                'title': {'strategy': ngWVal.StringValidation},
                'assignee_id': {'allowEmpty': true, 'strategy': ngWVal.IDNumericValidation},
                'completed': {'allowEmpty': true, 'strategy': ngWVal.BooleanValidation},
                'recurrence_type': {'allowEmpty': true, 'strategy': ngWVal.StringValidation},
                'recurrence_count': {'allowEmpty': true, 'strategy': ngWVal.IDNumericValidation},
                'due_date': {'allowEmpty': true, 'strategy': ngWVal.DateValidation},
                'starred': {'allowEmpty': true, 'strategy': ngWVal.BooleanValidation},
                'revision': {'strategy': ngWVal.EmptyRequired},
                'remove': {'allowEmpty': true, 'strategy': ngWVal.ArrayValidation}
            };
            validations[Scenarios.UPDATE] = {
                'list_id': {'allowEmpty': true, 'strategy': ngWVal.IDNumericValidation},
                'title': {'allowEmpty': true, 'strategy': ngWVal.StringValidation},
                'assignee_id': {'allowEmpty': true, 'strategy': ngWVal.IDNumericValidation},
                'completed': {'allowEmpty': true, 'strategy': ngWVal.BooleanValidation},
                'recurrence_type': {'allowEmpty': true, 'strategy': ngWVal.StringValidation},
                'recurrence_count': {'allowEmpty': true, 'strategy': ngWVal.IDNumericValidation},
                'due_date': {'allowEmpty': true, 'strategy': ngWVal.DateValidation},
                'starred': {'allowEmpty': true, 'strategy': ngWVal.BooleanValidation},
                'revision': {'strategy': ngWVal.IDNumericValidation},
                'remove': {'allowEmpty': true, ' strategy': ngWVal.ArrayValidation}
            };
            this.setFieldValidation(validations);
            this.notes = function () {
                var _id = false;
                try {
                    _id = this.getId();
                } catch (e) {
                    throw new Error('In order to get notes, the Task ID has to be specified');
                }
                return new Endpoint_Notes('notes').setParams({'task_id': _id});
            };
        };

        /**
         * @description Notes API endpoint
         * @link https://developer.wunderlist.com/documentation/endpoints/note
         * @param {String} name
         *
         * @returns Function returns a function representing the endpoint object for the Notes API
         */
        var Endpoint_Notes = function (name) {
            WunderlistEndpoint.call(this, name);
            this.setValidFields('task_id,content,revision'.split(','));
            var validations = {};
            validations[Scenarios.CREATE] = {
                'task_id': {'strategy': ngWVal.IDNumericValidation},
                'content': {'strategy': ngWVal.StringValidation},
                'revision': {'strategy': ngWVal.EmptyRequired}
            };
            validations[Scenarios.UPDATE] = {
                'task_id': {'strategy': ngWVal.EmptyRequired},
                'content': {'strategy': ngWVal.StringValidation},
                'revision': {'strategy': ngWVal.IDNumericValidation}
            };
            this.setFieldValidation(validations);
        };

        /**
         * @description Positions API endpoint
         * This endpoint acts a bit different than others. It was divided into three different endpoints to achieve
         * reusability, easy of use, and readability
         *
         * @see Endpoint_List_positions
         * @see Endpoint_Task_positions
         * @see Endpoint_Subtask_positions
         *
         * @link https://developer.wunderlist.com/documentation/endpoints/positions
         * @param {String} name
         *
         * @abstract Use List_positions, Task_positions, or Subtask_positions
         */
        var Endpoint_Positions = function (name) {
            WunderlistEndpoint.call(this, false);
            this.setAvailableMethods(Methods.GETALL | Methods.GET | Methods.UPDATE);
            this.setValidFields('values,revision'.split(','));
            var validations = {};
            validations[Scenarios.UPDATE] = {
                'values': {'strategy': ngWVal.ArrayValidation},
                'revision': {'strategy': ngWVal.IDNumericValidation}
            };
            this.setFieldValidation(validations);
        };

        /**
         * @description Position API endpoint
         * @link https://developer.wunderlist.com/documentation/endpoints/positions
         * @param {String} name
         *
         * @see Endpoint_Positions
         *
         * @returns Function returns a function representing the endpoint object for the List Positions API
         */
        var Endpoint_List_positions = function (name) {
            Endpoint_Positions.call(this, name);
            this.setEndpoint('list_positions');
        };

        /**
         * @description Position API endpoint
         * @link https://developer.wunderlist.com/documentation/endpoints/positions
         * @param {String} name
         *
         * @see Endpoint_Positions
         *
         * @returns Function returns a function representing the endpoint object for the Task Positions API
         */
        var Endpoint_Task_positions = function (name) {
            Endpoint_Positions.call(this, name);
            this.setEndpoint('task_positions');
        };

        /**
         * @description Position API endpoint
         * @link https://developer.wunderlist.com/documentation/endpoints/positions
         * @param {String} name
         *
         * @see Endpoint_Positions
         *
         * @returns Function returns a function representing the endpoint object for the Subtask Positions API
         */
        var Endpoint_Subtask_positions = function (name) {
            Endpoint_Positions.call(this, name);
            this.setEndpoint('subtask_positions');
        };

        /**
         * @description Reminders API endpoint
         * @link https://developer.wunderlist.com/documentation/endpoints/reminder
         * @param {String} name
         *
         * @returns Function returns a function representing the endpoint object for the Reminders API
         */
        var Endpoint_Reminders = function (name) {
            WunderlistEndpoint.call(this, name);
            this.setValidFields('task_id,date,created_by_device_udid,revision'.split(','));
            this.setAvailableMethods(Methods.CREATE | Methods.UPDATE | Methods.DELETE | Methods.GETALL);
            var validations = {};
            validations[Scenarios.CREATE] = {
                'task_id': {'strategy': ngWVal.IDNumericValidation},
                'date': {'strategy': ngWVal.DateValidation},
                'created_by_device_udid': {'allowEmpty': true, 'strategy': ngWVal.StringValidation},
                'revision': {'strategy': ngWVal.EmptyRequired}
            };
            validations[Scenarios.UPDATE] = {
                'revision': {'strategy': ngWVal.IDNumericValidation},
                'date': {'strategy': ngWVal.DateValidation},
                'created_by_device_udid': {'allowEmpty': true, 'strategy': ngWVal.StringValidation}
            };
            this.setFieldValidation(validations);
        };

        /**
         * @description Root API endpoint
         * @link https://developer.wunderlist.com/documentation/endpoints/root
         * @param {String} name
         *
         * @returns Function returns a function representing the endpoint object for the Root API
         */
        var Endpoint_Root = function (name) {
            WunderlistEndpoint.call(this, name);
            this.setAvailableMethods(Methods.GET);
        };

        /**
         * @description Subtasks API endpoint
         * @link https://developer.wunderlist.com/documentation/endpoints/subtask
         * @param {String} name
         *
         * @returns Function returns a function representing the endpoint object for the Subtasks API
         */
        var Endpoint_Subtasks = function (name) {
            WunderlistEndpoint.call(this, name);
            this.setValidFields('task_id,title,completed,revision'.split(','));
            var validations = {};
            validations[Scenarios.CREATE] = {
                'revision': {'strategy': ngWVal.EmptyRequired},
                'task_id': {'strategy': ngWVal.IDNumericValidation},
                'title': {'strategy': ngWVal.StringValidation},
                'completed': {'allowEmpty': true, 'strategy': ngWVal.BooleanValidation}
            };
            validations[Scenarios.UPDATE] = {
                'revision': {'strategy': ngWVal.IDNumericValidation},
                'title': {'strategy': ngWVal.StringValidation},
                'completed': {'allowEmpty': true, 'strategy': ngWVal.BooleanValidation}
            };
            this.setFieldValidation(validations);
        };

        /**
         * @description Task Comments API endpoint
         * @link https://developer.wunderlist.com/documentation/endpoints/task_comment
         * @param {String} name
         *
         * @returns Function returns a function representing the endpoint object for the Task Comments API
         */
        var Endpoint_Task_comments = function (name) {
            WunderlistEndpoint.call(this, name);
            this.setValidFields('revision,task_id,text'.split(','));
            this.setAvailableMethods(Methods.GET | Methods.GETALL | Methods.CREATE | Methods.DELETE);
            var validations = {};
            validations[Scenarios.CREATE] = {
                'revision': {'strategy': ngWVal.EmptyRequired},
                'task_id': {'strategy': ngWVal.IDNumericValidation},
                'text': {'strategy': ngWVal.StringValidation}
            };
            validations[Scenarios.UPDATE] = {
                'revision': {'strategy': ngWVal.IDNumericValidation},
                'text': {'strategy': ngWVal.StringValidation}
            };
            this.setFieldValidation(validations);
        };

        /**
         * @description Avatar API endpoint
         * @link https://developer.wunderlist.com/documentation/endpoints/avatar
         * @param {String} name
         *
         * @ignore This function has little to no value for now, as it redirects the user and angular won't let the redirection go through/
         *
         * @returns Function returns a function representing the endpoint object for the Folders API
         */
        var Endpoint_Avatar = function (name) {
            WunderlistEndpoint.call(this, name);
            this.setAvailableMethods(Methods.GET);
        };

        extend(WunderlistEndpoint, Endpoint_Avatar);
        extend(WunderlistEndpoint, Endpoint_Task_comments);
        extend(WunderlistEndpoint, Endpoint_Subtasks);
        extend(WunderlistEndpoint, Endpoint_Root);
        extend(WunderlistEndpoint, Endpoint_Positions);
        extend(WunderlistEndpoint, Endpoint_Tasks);
        extend(WunderlistEndpoint, Endpoint_Notes);
        extend(WunderlistEndpoint, Endpoint_Memberships);
        extend(WunderlistEndpoint, Endpoint_Lists);
        extend(WunderlistEndpoint, Endpoint_User);
        extend(WunderlistEndpoint, Endpoint_Folders);
        extend(WunderlistEndpoint, Endpoint_Filepreview);
        extend(WunderlistEndpoint, Endpoint_Reminders);
        extend(Endpoint_Positions, Endpoint_Task_positions);
        extend(Endpoint_Positions, Endpoint_List_positions);
        extend(Endpoint_Positions, Endpoint_Subtask_positions);

        Endpoint_Filepreview.prototype.validateParams = function (method) {
            var _params = this.getParams();
            switch (method) {
                case Methods.GET:
                    if (!_params['file_id']) {
                        throw new Error('file_id is needed in file preview');
                    }
                    new ngWVal.IDNumericValidation().setProperty('file_id').setValue(_params['file_id']).validate();
                    var available_platforms = 'mac,web,windows,iphone,ipad,android'.split(',');
                    if (available_platforms.indexOf(_params.platform) === -1) {
                        throw new Error('Invalid platform name. Supported elements are: ' + available_platforms.join(', '));
                    }
                    var validSizes = 'nonretina,retina'.split(',');
                    if (validSizes.indexOf(_params.size) === -1) {
                        throw new Error('Invalid size. Supported sizes are: ' + validSizes.join(', '));
                    }
                    break;
            }
        };

        Endpoint_Filepreview.prototype.buildGetUrl = function (url) {
            return $http.get(this.buildQuery(url, this.getParams()), this.getConfig());
        };

        Endpoint_Avatar.prototype.validateParams = function (method) {
            var _params = this.getParams();
            switch (method) {
                case Methods.GET:
                    if (!_params.user_id) {
                        throw new Error('User ID is required for avatar endpoint');
                    }

                    new ngWVal.IDNumericValidation().setValue(_params.user_id).setProperty('user_id').validate();
                    if (_params.size) {
                        var _options = '25,28,30,32,50,54,56,60,64,108,128,135,256,270,512'.split(',');
                        if (_options.indexOf(_params.size) == +-1) {
                            throw new Error('Size attribute is not one of the following: ' + _options.join(', '));
                        }
                    }

                    if (_params.fallback) {
                        _params.fallback = !!_params.fallback;
                    }
                    break;
            }
        };

        Endpoint_Avatar.buildGetUrl = function (url) {
            return $http.get(this.buildQuery(url, this.getParams()), this.getConfig());
        };

        Endpoint_User.prototype.getAll = function () {
            return this.execute('users', Methods.GETALL);
        };

        Endpoint_User.prototype.get = function () {
            return this.execute(this.getEndpoint(), Methods.GET);
        };

        Endpoint_Memberships.prototype.postValidation = function (scenario) {
            var _data = this.getData();
            switch (scenario) {
                case Scenarios.CREATE:
                    if (!_data.user_id && !_data.email) {
                        throw new Error(this.getEndpoint() + ' creation requires either a user_id or email');
                    }
                    break;
                case Scenarios.UPDATE:
                    if (_data.state !== 'accepted') {
                        throw new Error(this.getEndpoint() + ' update requires state to be accepted');
                    }
            }
        };

        Endpoint_Tasks.prototype.postValidation = function () {
            var _data = this.getData();
            var rec_type = _data.recurrence_type;
            var rec_count = _data.recurrence_count;
            if (rec_type || rec_count) {
                if (!rec_type || !rec_count) {
                    throw new Error(this.getEndpoint() + ' recurrence type and recurrence count need to be present at the same time');
                }
                var valid_rec_types = 'day,week,month,year'.split(',');
                if (valid_rec_types.indexOf(rec_type) === -1) {
                    throw new Error(this.getEndpoint() + ' recurrence type needs does not match any valid option [' + valid_rec_types.join(', ') + ']');
                }
            }
        };

        Endpoint_Tasks.prototype.validateParams = function (method) {
            if (method !== Methods.GETALL) {
                return;
            }
            var _params = this.getParams();
            if (!_params.list_id) {
                throw new Error('List ID is needed to get Tasks');
            }
            if (_params.completed) {
                _params.completed = !!_params.completed;
            }
        };

        Endpoint_Tasks.prototype.buildGetAllUrl = function (url) {
            return $http.get(this.buildQuery(url, this.getParams()), this.getConfig());
        };

        Endpoint_Tasks.prototype.prepare = function (scenario) {
            var _data = this.getData();
            if (((Scenarios.CREATE & scenario) !== scenario ) || _data.list_id) {
                return
            }
            _data['list_id'] = this.getTaskId();
            this.setData(_data);
        };

        Endpoint_Tasks.prototype.buildPostUrl = function (url) {
            return $http.post(this.buildQuery(url, {'list_id': this.getListId()}), this.getData(), this.getConfig());
        };

        Endpoint_Notes.prototype.validateParams = function (method) {
            if (method !== Methods.GETALL) {
                return;
            }
            var _params = this.getParams();
            if (!_params.task_id) {
                throw new Error('Task ID is required to retrieve Notes');
            }
        };

        Endpoint_Notes.prototype.buildGetAllUrl = function (url) {
            return $http.get(this.buildQuery(url, this.getParams()), this.getConfig());
        };

        Endpoint_Notes.prototype.prepare = function (scenario) {
            var _data = this.getData();
            if (((Scenarios.CREATE & scenario) !== scenario ) || _data.task_id) {
                return
            }
            _data['task_id'] = this.getTaskId();
            this.setData(_data);
        };

        Endpoint_Positions.prototype.prepare = function () {
            if (!this.getEndpoint()) {
                throw new Error('Endpoint is null, the Positions endpoint needs to be called as list_positions, task_positions, or subtask_positions');
            }
        };

        Endpoint_Task_positions.prototype.validateParams = function (method) {
            if (method !== Methods.GETALL) {
                return;
            }
            var _params = this.getParams();
            if (!_params.list_id) {
                throw new Error('List ID is required to retrieve task positions');
            }
        };

        Endpoint_Task_positions.prototype.buildGetAllUrl = function (url) {
            return $http.get(this.buildQuery(url, this.getParams()), this.getConfig());
        };

        Endpoint_Subtask_positions.prototype.validateParams = function (method) {
            if (method !== Methods.GETALL) {
                return;
            }
            var _params = this.getListOrTask();
            this.setParams(_params);
        };

        Endpoint_Subtask_positions.prototype.buildGetAllUrl = function (url) {
            return $http.get(this.buildQuery(url, this.getParams()), this.getConfig());
        };

        Endpoint_Reminders.prototype.validateParams = function (method) {
            if (method !== Methods.GETALL) {
                return;
            }
            var _params = this.getListOrTask();
            this.setParams(_params);
        };

        Endpoint_Reminders.prototype.buildGetAllUrl = function (url) {
            return $http.get(this.buildQuery(url, this.getParams()), this.getConfig());
        };

        Endpoint_Reminders.prototype.prepare = function (scenario) {
            var _data = this.getData();
            if (((Scenarios.CREATE & scenario) !== scenario ) || _data.task_id) {
                return;
            }
            _data['task_id'] = this.getTaskId();
            this.setData(_data);
        };

        Endpoint_Root.prototype.get = function () {
            return this.execute(this.getEndpoint(), Methods.GET);
        };

        Endpoint_Subtasks.prototype.prepare = function (scenario) {
            var _data = this.getData();
            if (((Scenarios.CREATE & scenario) !== scenario ) || _data.task_id) {
                return
            }
            _data['task_id'] = this.getTaskId();
            this.setData(_data);
        };

        Endpoint_Subtasks.prototype.validateParams = function (method) {
            if (method !== Methods.GETALL) {
                return;
            }
            var _params = this.getListOrTask();
            var _oldParams = this.getParams();
            if (_oldParams.completed) {
                _params.completed = !!_oldParams.completed;
            }
            this.setParams(_params);
        };

        Endpoint_Subtasks.prototype.buildGetAllUrl = function (url) {
            return $http.get(this.buildQuery(url, this.getParams()), this.getConfig());
        };

        Endpoint_Task_comments.prototype.prepare = function (scenario) {
            var _data = this.getData();
            if (((Scenarios.CREATE & scenario) !== scenario ) || _data.task_id) {
                return
            }
            _data['task_id'] = this.getTaskId();
            this.setData(_data);
        };

        Endpoint_Task_comments.prototype.validateParams = function (method) {
            if (method !== Methods.GETALL) {
                return;
            }
            var _params = this.getListOrTask();
            this.setParams(_params);
        };

        Endpoint_Task_comments.prototype.buildGetAllUrl = function (url) {
            return $http.get(this.buildQuery(url, this.getParams()), this.getConfig());
        };

        service.Endpoint_Avatar = Endpoint_Avatar;
        service.Endpoint_Task_comments = Endpoint_Task_comments;
        service.Endpoint_Subtasks = Endpoint_Subtasks;
        service.Endpoint_Root = Endpoint_Root;
        service.Endpoint_Positions = Endpoint_Positions;
        service.Endpoint_Tasks = Endpoint_Tasks;
        service.Endpoint_Notes = Endpoint_Notes;
        service.Endpoint_Memberships = Endpoint_Memberships;
        service.Endpoint_Lists = Endpoint_Lists;
        service.Endpoint_User = Endpoint_User;
        service.Endpoint_Folders = Endpoint_Folders;
        service.Endpoint_Filepreview = Endpoint_Filepreview;
        service.Endpoint_Reminders = Endpoint_Reminders;
        service.Endpoint_Task_positions = Endpoint_Task_positions;
        service.Endpoint_List_positions = Endpoint_List_positions;
        service.Endpoint_Subtask_positions = Endpoint_Subtask_positions;

        return service;
    }];


    /**
     * @name NgWunderlistValidation Service
     *
     * @description This service provides a centralized location for all validation classes (strategies) to be used for
     * parameter validation or field validation in the endpoints.
     *
     * @property {String} name The name of the validation to be performed.
     * @property {String} variableType The variable type the validation expects. This is used to validate not only the content but also that we get numbers where we need numbers and not an array, for example
     * @property {Boolean} validateType A flag to determine whether or not to validate a variable type. Useful for when we don't care what type of value we get, just that we do ( or don't ) get one
     * @property {String} property The name of the property being validated. This is used for error reporting, to give the user more information about which validation failed
     * @property {Object} value The value to validate against a given strategy.
     * @property {Boolean} allowEmpty A flag to determine whether or not the value can be empty or it needs to be enforced.
     *
     * @returns Object returns an object that serves as container for validation strategies.
     */

    var ngWunderlistValidationService = function () {
        var Validation = function (name, variableType) {

            this.setName = function (name) {
                this.name = name;
                return this;
            };

            this.getName = function () {
                return this.name;
            };

            this.setValue = function (value) {
                this.value = value;
                return this;
            };

            this.setProperty = function (name) {
                this.property = name;
                return this;
            };

            this.getProperty = function () {
                return this.property;
            };

            this.getValue = function () {
                return this.value;
            };

            this.setVariableType = function (type) {
                this.variableType = type;
                return this;
            };

            this.getVariableType = function () {
                return this.variableType;
            };

            this.setAllowEmpty = function (state) {
                this.allowEmpty = !!state;
            };

            this.getAllowEmpty = function () {
                return this.allowEmpty;
            };

            this.setValidateType = function (state) {
                this.validateType = !!state;
            };

            this.getValidateType = function () {
                return this.validateType;
            };

            this.validate = function (allowEmpty) {
                if (allowEmpty) {
                    this.setAllowEmpty(!!allowEmpty);
                }
                if (this.getValidateType() && (((typeof this.getValue()) != this.getVariableType()) && (typeof this.getValue() !== 'undefined'))) {
                    this.typeError();
                }
                this.validationFunction();
            };

            this.error = function (message) {
                throw new Error(this.getName() + ' validation error. ' + this.getProperty() + ' ' + message);
            };

            this.typeError = function () {
                throw new Error(this.getProperty() + ' is not of type ' + this.getVariableType());
            };

            this.setName(name);
            this.setVariableType(variableType);
            this.validateType = true;
            this.property = undefined;
            this.value = undefined;
            this.allowEmpty = false;

        };

        Validation.prototype.validationFunction = function () {
            throw new Error('Validation function not defined');
        };

        var service = this;


        /**
         * IDNumericValidation validates for numbers that are greater than 0.
         */
        var IDNumericValidation = function () {
            Validation.call(this, 'Numeric', 'number');
        };

        /**
         * StringValidation Validates for strings that are not empty, but no bigger than 255 characters
         */
        var StringValidation = function () {
            Validation.call(this, 'String', 'string');
        };

        /**
         * EmptyRequired Special validation strategy. This validation strategy is to keep parameters from being sent
         * when they are not supposed to, such as revision during an element creation./
         *
         */
        var EmptyRequired = function () {
            Validation.call(this, 'EmptyRequired', 'object');
            this.setValidateType(false);
        };

        /**
         * EmailValidation validates email addresses.
         */
        var EmailValidation = function () {
            Validation.call(this, 'EmailValidation', 'string');
        };

        /**
         * ArrayValidation validates that the value passed is of type array
         */
        var ArrayValidation = function () {
            Validation.call(this, 'ArrayValidation', 'array');
            this.setValidateType(false);
        };

        /**
         * BooleanValidation validates that the value passed is a boolean (true|false)
         */
        var BooleanValidation = function () {
            Validation.call(this, 'BooleanValidation', 'boolean');
        };

        /**
         * DateValidation validates dates based on the ISO8601 format
         */
        var DateValidation = function () {
            Validation.call(this, 'DateValidation', 'string');
        };

        extend(Validation, ArrayValidation);
        extend(Validation, StringValidation);
        extend(Validation, BooleanValidation);
        extend(Validation, EmptyRequired);
        extend(Validation, EmailValidation);
        extend(Validation, IDNumericValidation);
        extend(Validation, DateValidation);

        IDNumericValidation.prototype.validationFunction = function () {
            var value = this.getValue();
            if (!this.getAllowEmpty() && !value) {
                this.error('is empty');
            }
            if (value && 0 >= value) {
                this.error('has to be greater than 0');
            }
        };

        StringValidation.prototype.validationFunction = function () {
            var value = this.getValue();
            if (value === "" && !this.getAllowEmpty()) {
                this.error('cannot be empty');
            }
            if (value && value.length > 255) this.error('cannot exceed 255 characters');
        };

        EmptyRequired.prototype.validationFunction = function () {
            if (typeof this.getValue() !== 'undefined') {
                this.error('needs to be empty');
            }
        };

        EmailValidation.prototype.validationFunction = function () {
            var regexp = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            var value = this.getValue();
            if (!this.getAllowEmpty() && !value) {
                this.error('cannot be empty');
            }
            if (value && !regexp.test(value)) {
                this.error('is not a valid email');
            }
        };

        ArrayValidation.prototype.validationFunction = function () {
            var value = this.getValue();

            if (!this.getAllowEmpty() && !Array.isArray(value)) {
                this.error('not an array');
            }

            if (!this.getAllowEmpty() && (!value || value.length <= 0)) {
                this.error('cannot be empty');
            }
        };

        BooleanValidation.prototype.validationFunction = function () {
            var value = this.getValue();
            if (!this.getAllowEmpty() && !value) {
                this.error('cannot be empty');
            }
            if (value && (!!value) != value) {
                this.error('is not a valid boolean field');
            }
        };

        DateValidation.prototype.validationFunction = function () {
            var regexp = /^([+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([.,]\d+(?!:))?)?(\17[0-5]\d([.,]\d+)?)?([zZ]|([+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/;
            var value = this.getValue();

            if (!this.getAllowEmpty() && !value) {
                this.error('cannot be empty');
            }
            if (value && !regexp.test(value)) {
                this.error('is not a valid ISO 8601 date.');
            }
        };

        service.IDNumericValidation = IDNumericValidation;
        service.StringValidation = StringValidation;
        service.EmptyRequired = EmptyRequired;
        service.EmailValidation = EmailValidation;
        service.ArrayValidation = ArrayValidation;
        service.BooleanValidation = BooleanValidation;
        service.DateValidation = DateValidation;

        return service;
    };
    var ngWunderlistConfigurator = function () {
        var clientId = "";
        var authToken = "";
        return {
            setClientId: function (clientID) {
                clientId = clientID;
            },
            getClientId: function () {
                return clientId;
            },
            setAuthToken: function (token) {
                authToken = token;
            },
            getAuthToken: function () {
                return authToken;
            },
            getConfig: function () {
                return {headers: {'X-Access-Token': authToken, 'X-Client-ID': clientId}};
            },
            $get: function () {
                return this;
            }
        };
    };

    ngWunderlistModule.service('ngWunderlistService', ngWunderlistService);
    ngWunderlistModule.service('ngWunderlistEndpointService', ngWunderlistEndpointService);
    ngWunderlistModule.service('ngWunderlistValidation', ngWunderlistValidationService);
    ngWunderlistModule.provider('ngWunderlistConfigurator', ngWunderlistConfigurator);

    /**
     * Classes Inheritance helpers
     **/
    function extend(base, sub) {
        sub.prototype = Object.create(base.prototype);
        sub.prototype['constructor'] = sub;
    }
})(angular);