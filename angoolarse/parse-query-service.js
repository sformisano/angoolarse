'use strict';

angular.module('angoolarse').service('ParseQueryService', function(){

  function _maybeOrderBy(parseQuery, queryParams){
    if( queryParams.orderBy ){
      parseQuery[queryParams.orderBy.sorting](queryParams.orderBy.columnName);
    }
  }

  function _maybeAddEqualTo(parseQuery, queryParams){
    if( queryParams.equalTo ){
      angular.forEach(queryParams.equalTo, function(equalToVal, equalToKey){
        parseQuery.equalTo(equalToKey, equalToVal);
      });
    }
  }

  function _maybeLimit(parseQuery, queryParams){
    if( queryParams.limit ){
      parseQuery.limit(queryParams.limit);
    }
  }

  function _maybeSkip(parseQuery, queryParams){
    if( queryParams.skip ){
      parseQuery.skip(queryParams.skip);
    }
  }

  function _maybeIncludePointers(parseQuery, parseClassData){
    if(parseClassData.parseClassPointers){
      angular.forEach(parseClassData.parseClassPointers, function(pointer){
        parseQuery.include(pointer.parseColumnName);
      });
    }
  }

  return function ParseQueryService(parseClassData, queryParams){
    var ParseClass = Parse.Object.extend(parseClassData.parseClassName),
        parseQuery = new Parse.Query(ParseClass);

    if(queryParams){
      _maybeAddEqualTo(parseQuery, queryParams);
      _maybeSkip(parseQuery, queryParams);
      _maybeLimit(parseQuery, queryParams);
      _maybeOrderBy(parseQuery, queryParams);
    }

    _maybeIncludePointers(parseQuery, parseClassData);

    return parseQuery;
  };

});