'use strict';

angular.module('angoolarse').service('parseUserService', function($q, parseService){

  return angular.extend({}, parseService, {
    parseClassData : {
      parseClassName : 'User',
      parseClassProperties : ['username', 'password', 'email', 'firstName', 'lastName']
    },

    getByUsername : function(username, options){
      var deferred = $q.defer();
      
      this
        .getAll(
          {equalTo: { username: username }, limit: 1},
          {toJSON: options.toJSON}
        )
        .then(function(users){
          if( users.length === 1 ){
            deferred.resolve(users[0]);
          }
          else{
            deferred.reject('No user found');
          }
        });

      return deferred.promise;
    },
    
    create: function(userData) {
      var deferred = $q.defer();

      var user = new Parse.User();

      user.set('firstName', userData.firstName);
      user.set('lastName', userData.lastName);
      user.set('email', userData.email);
      user.set('username', userData.username);
      user.set('password', userData.password);
       
      user.signUp(null, {
        success: function(user) {
          deferred.resolve(user);
        },
        error: function(user, error) {
          deferred.reject(error);
        }
      });

      return deferred.promise;
    },
    
    update: function(userData) {
      var deferred = $q.defer();

      var user = new Parse.User();

      user.set('id', userData.objectId);
      user.set('firstName', userData.firstName);
      user.set('lastName', userData.lastName);
      user.set('email', userData.email);
      user.set('username', userData.username);
      user.set('password', userData.password);
       
      user.save(null, {
        success: function(user) {
          deferred.resolve(user);
        },
        error: function(user, error) {
          deferred.reject(error);
        }
      });

      return deferred.promise;
    }
  });

});
