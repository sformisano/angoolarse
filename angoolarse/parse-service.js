'use strict';

angular.module('angoolarse').service('parseService', function($q, ParseQueryService){


  /*** CONVERT PARSE OBJECTS TO JSON OBJECTS ***/

  function _maybeToJSON(toJSON, parseClassData, parseData){
    var deferred = $q.defer();

    if( ! toJSON ){
      deferred.resolve(parseData);
    }
    else{
      if( Object.prototype.toString.call(parseData) === '[object Array]' ){
        _maybeCollectionToJSON(toJSON, parseClassData, parseData).then(function(jsonData){
          deferred.resolve(jsonData);
        });
      }
      else{
        _maybeModelToJSON(toJSON, parseClassData, parseData).then(function(jsonData){
          deferred.resolve(jsonData);
        });
      }
    }

    return deferred.promise;
  }

  function _maybeCollectionToJSON(toJSON, parseClassData, parseArray){
    var deferred = $q.defer(),
        parseArrayLength = parseArray.length,
        parseArrayC = 0,
        jsonArray = [];

    if(parseArrayLength === 0){
      deferred.resolve([]);
    }
    else{
      $.map(parseArray, function(parseObject, i){
        _maybeModelToJSON(toJSON, parseClassData, parseObject).then(function(jsonObject){
          jsonArray[i] = jsonObject;

          parseArrayC = parseArrayC + 1;

          if( parseArrayC === parseArrayLength ){
            deferred.resolve(jsonArray);
          }
        });
      });
    }

    return deferred.promise;
  }

  function _maybeModelToJSON(toJSON, parseClassData, parseObject){
    var deferred = $q.defer(),
        jsonModel;

    if( toJSON ){
      jsonModel = parseObject.toJSON();

      if(parseClassData.parseClassRelations){
        angular.forEach(parseClassData.parseClassRelations, function(relationParseClassData, relationColumnName){
          var relationParseObjects = parseObject.get(relationColumnName);

          if(relationParseObjects){
            jsonModel[relationColumnName] = [];

            angular.forEach(relationParseObjects, function(relationParseObject, i){
              jsonModel[relationColumnName][i] = relationParseObject.toJSON();
            });
          }
        });
      }

      if(parseClassData.parseClassPointers){
        angular.forEach(parseClassData.parseClassPointers, function(pointerParseClassData){
          var pointedObject = parseObject.get(pointerParseClassData.parseColumnName);
          jsonModel[pointerParseClassData.parseColumnName] = pointedObject.toJSON();
        });
      }

      deferred.resolve(jsonModel);
    }
    else{
      deferred.resolve(parseObject);
    }

    return deferred.promise;
  }


  /*** CONVERT JSON OBJECTS TO PARSE OBJECTS ***/

  function _maybeToParse(toParse, parseClassData, jsonData){
    var deferred = $q.defer();

    if( ! toParse ){
      deferred.resolve(jsonData);
    }

    if( Object.prototype.toString.call(jsonData) === '[object Array]' ){
      _maybeCollectionToParse(toParse, parseClassData, jsonData).then(function(parseData){
        deferred.resolve(parseData);
      });
    }
    else{
      _maybeModelToParse(toParse, parseClassData, jsonData).then(function(parseData){
        deferred.resolve(parseData);
      });
    }

    return deferred.promise;
  }

  function _maybeCollectionToParse(toParse, parseClassData, jsonArray){
    var deferred = $q.defer(),
        jsonArrayLength = jsonArray.length,
        jsonArrayC = 0,
        parseObjects = [];


    if(jsonArrayLength === 0){
      deferred.resolve([]);
    }
    else{
      $.map(jsonArray, function(jsonObject, i){
        jsonArrayC = jsonArrayC + 1;
        _maybeModelToParse(toParse, parseClassData, jsonObject).then(function(parseObject){
          parseObjects[i] = parseObject;

          if( jsonArrayC === jsonArrayLength ){
            deferred.resolve(parseObjects);
          }
        });
      });
    }

    return deferred.promise;
  }

  function _maybeModelToParse(toParse, parseClassData, jsonObject){
    var deferred = $q.defer();

    _getById(parseClassData, jsonObject.objectId).then(function(parseObject){
      deferred.resolve(parseObject);
    });

    return deferred.promise;
  }


  /*** PARSE READ QUERIES ***/

  function _getBy(parseClassData, queryParams, options){
    options = options || {};

    var deferred = $q.defer(),
        parseQuery = new ParseQueryService(parseClassData, queryParams);

    parseQuery.find({
      success: function(results){
        _maybeIncludeRelations(parseClassData, results).then(function(results){
          _maybeToJSON(options.toJSON, parseClassData, results).then(function(results){
            if(results.length && queryParams.limit === 1){
              results = results[0];
            }

            deferred.resolve(results);
          });
        });
      },
      error: function(error){
        deferred.reject(error);
      }
    });

    return deferred.promise;
  }

  function _getById(parseClassData, parseObjectId, options){
    options = options || {};

    var deferred = $q.defer(),
        parseQuery = new ParseQueryService(parseClassData);

    parseQuery.get(parseObjectId, {
      success: function(result){
        _maybeIncludeRelations(parseClassData, result).then(function(result){
          _maybeToJSON(options.toJSON, parseClassData, result).then(function(result){
            deferred.resolve(result);
          });
        });
      },
      error: function(error){
        deferred.reject(error);
      }
    });

    return deferred.promise;
  }

  function _getAll(parseClassData, queryParams, options){
    options = options || {};

    var deferred = $q.defer(),
        parseQuery = new ParseQueryService(parseClassData, queryParams);

    parseQuery.find({
      success: function(results){
        _maybeIncludeRelations(parseClassData, results).then(function(results){
          _maybeToJSON(options.toJSON, parseClassData, results).then(function(results){
            deferred.resolve(results);
          });
        });
      },

      error: function(error){
        deferred.reject(error);
      }
    });
      

    return deferred.promise;
  }

  function _getAllCount(parseClassData, queryParams){
    var deferred = $q.defer(),
        parseQuery = new ParseQueryService(parseClassData, queryParams);

    parseQuery.count({
      success: function(count) {
        deferred.resolve(count);
      },
      error: function(error) {
        deferred.reject(error);
      }
    });

    return deferred.promise;
  }


  /*** PARSE WRITE QUERIES ***/

  function _save(parseClassData, parseObject, jsonObject){
    var deferred = $q.defer();

    angular.forEach(parseClassData.parseClassProperties, function(propertyName){
      parseObject.set(propertyName, jsonObject[propertyName]);
    });
      
    parseObject.save(null, {
      success : function(result){
        if( parseClassData.parseClassPointers ){
          angular.forEach(parseClassData.parseClassPointers, function(pointer){
            result.set(pointer.parseColumnName, {
              __type: 'Pointer',
              className: pointer.parseClassName,
              objectId: jsonObject[pointer.parseColumnName].objectId
            });
          });

          result.save(null, {
            success: function(){
              deferred.resolve(result);
            }
          });
        }
        else{
          deferred.resolve(result);
        }
      },

      error : function(error){
        deferred.reject(error);
      }
    });

    return deferred.promise;
  }

  function _destroy(parseClassData, objectId){
    var deferred = $q.defer();

    _getById(parseClassData, objectId).then(function(parseObject){
      parseObject.destroy({
        success: function(parseObject) {
          deferred.resolve(parseObject);
        },
        error: function(parseObject, error){
          deferred.reject(error);
        }
      });
    });

    return deferred.promise;
  }

  function _toggleRelation(method, parseObject, relationParseClassData, relationJsonObject){
    var deferred = $q.defer();

    _maybeToParse(true, relationParseClassData, relationJsonObject)
      .then(function(relationParseObject){

        parseObject.relation(relationParseClassData.parseClassName)[method](relationParseObject);

        parseObject.save(null, {
          success: function(){
            deferred.resolve(true);
          }
        });
      });

    return deferred.promise;
  }


  /*** INCLUDE RELATIONS IN PARSE OBJECTS RETURNED BY PARSE QUERIES ***/

  function _maybeIncludeRelations(parseClassData, parseData){
    var deferred = $q.defer();

    if( parseClassData.parseClassRelations ){
      if( Object.prototype.toString.call(parseData) === '[object Array]' ){
        _maybeIncludeCollectionRelations(parseClassData, parseData)
          .then(function(parseObjects){
            deferred.resolve(parseObjects);
          });
      }
      else{
        _maybeIncludeModelRelations(parseClassData, parseData)
          .then(function(parseObject){
            deferred.resolve(parseObject);
          });
      }
    }
    else{
      deferred.resolve(parseData);
    }

    return deferred.promise;
  }

  function _maybeIncludeCollectionRelations(parseClassData, parseObjects){
    var deferred = $q.defer(),
        parseObjectsN = parseObjects.length,
        parseObjectsC = 0,
        parseObjectsWithRelations = [];

    $.map(parseObjects, function(parseObject, i){
      _maybeIncludeModelRelations(parseClassData, parseObject)
        .then(function(parseObjectWithRelations){
          parseObjectsWithRelations[i] = parseObjectWithRelations;
          parseObjectsC = parseObjectsC + 1;

          if(parseObjectsC === parseObjectsN){
            deferred.resolve(parseObjectsWithRelations);
          }
        });
    });

    return deferred.promise;
  }

  function _maybeIncludeModelRelations(parseClassData, parseObject){
    var deferred = $q.defer(),
        relationsN = parseClassData.parseClassRelations ? Object.keys(parseClassData.parseClassRelations).length : 0,
        relationsC = 0;

    if(parseClassData.parseClassRelations){
      angular.forEach(parseClassData.parseClassRelations, function(relationParseClassData, relationColumnName){
        var relation = parseObject.relation(relationParseClassData.parseClassData.parseClassName);

        if(relation){
          relation.query().find({
            success: function(relationParseObjects) {
              parseObject.set(relationColumnName, relationParseObjects);

              relationsC = relationsC + 1;

              if(relationsC === relationsN){
                deferred.resolve(parseObject);
              }
            },
            error: function(){
              relationsC = relationsC + 1;

              if( relationsC === relationsN ){
                deferred.resolve(parseObject);
              }
            }
          });
        }
      });
    }

    return deferred.promise;
  }

  
  /*** RETURN SERVICE ***/

  return {
    getAll : function(queryParams, options){
      return _getAll(this.parseClassData, queryParams, options);
    },

    getAllCount : function(queryParams){
      return _getAllCount(this.parseClassData, queryParams);
    },

    getBy : function(queryParams, options){
      return _getBy(this.parseClassData, queryParams, options);
    },

    getById : function(objectId, options){
      return _getById(this.parseClassData, objectId, options);
    },

    _create : function(jsonObject){
      var parseClassName = this.parseClassData.parseClassName,
          ParseClass = Parse.Object.extend(parseClassName),
          parseObject = new ParseClass();

      return _save(this.parseClassData, parseObject, jsonObject);
    },

    _update : function(jsonObject){
      var that = this,
          deferred = $q.defer();

      this.getById(jsonObject.objectId).then(function(parseObject){
        _save(that.parseClassData, parseObject, jsonObject).then(
          function(result){
            deferred.resolve(result);
          },
          function(error){
            deferred.reject(error);
          }
        );
      });

      return deferred.promise;
    },

    save : function(jsonObject){
      var saveMethod = jsonObject.objectId ? '_update' : '_create';
      return this[saveMethod](jsonObject);
    },

    destroy : function(objectId){
      return _destroy(this.parseClassData, objectId);
    },

    _toggleRelation : function(method, jsonObject, relationParseClassData, relationJsonObject){
      this.getById(jsonObject.objectId).then(function(parseObject){
        _toggleRelation(
          method,
          parseObject,
          relationParseClassData,
          relationJsonObject
        );
      });
    },

    addRelation : function(jsonObject, relationParseClassData, relationJsonObject){
      return this._toggleRelation('add', jsonObject, relationParseClassData, relationJsonObject);
    },

    removeRelation : function(jsonObject, relationParseClassData, relationJsonObject){
      return this._toggleRelation('remove', jsonObject, relationParseClassData, relationJsonObject);
    }
  };


});