
require('prototype.spawn')();
var roleHarvester = require('role.harvester');
var roleUpgrader = require('role.upgrader');
var roleBuilder = require('role.builder');
var roleRepairer = require('role.repairer');
var roleTower = require('role.tower');
var ROOM = Game.rooms['E83S75'];

module.exports.loop = function () {

    for(let name in Game.rooms) {
        console.log('Room "'+name+'" has '+Game.rooms['E83S75'].energyAvailable+' energy');
    }

    for(let name in Memory.creeps) {
        if(!Game.creeps[name]) {
            delete Memory.creeps[name];
        }
    }

    var harvesters = _.filter(Game.creeps, (creep) => creep.memory.role == 'harvester');
    var upgraders = _.filter(Game.creeps, (creep) => creep.memory.role == 'upgrader');
    var builders = _.filter(Game.creeps, (creep) => creep.memory.role == 'builder');
    var repairers = _.filter(Game.creeps, (creep) => creep.memory.role == 'repairer');
    var energy = Game.rooms['E83S75'].energyCapacityAvailable;
    var energyAvialable = Game.rooms['E83S75'].energyAvailable;

    console.log('Harvesters: ' + harvesters.length+' upgraders: ' + upgraders.length+
        ' builders: ' + builders.length+' repairers'+repairers.length);

    if(harvesters.length < 5 && energyAvialable == energy) {
        var newName = Game.spawns['MaxSpawn'].createCustomCreep(energy, 'harvester');
        console.log('Spawning new harvester: ' + newName);
    } else if(upgraders.length < 3 && energyAvialable == energy) {
        var newName = Game.spawns['MaxSpawn'].createCustomCreep(energy, 'upgrader');
        console.log('Spawning new upgrader: ' + newName);
    } else if(builders.length < 2 && energyAvialable == energy) {
        var newName = Game.spawns['MaxSpawn'].createCustomCreep(energy, 'builder');
        console.log('Spawning new builder: ' + newName);
    } else if(repairers.length < 1 && energyAvialable == energy) {
        var newName = Game.spawns['MaxSpawn'].createCustomCreep(energy, 'repairer');
        console.log('Spawning new repairer: ' + newName);
    } else {
        console.log('All completed');
    }

    if(Game.spawns['MaxSpawn'].spawning) {
        var spawningCreep = Game.creeps[Game.spawns['MaxSpawn'].spawning.name];
        Game.spawns['MaxSpawn'].room.visual.text(
            '🛠️' + spawningCreep.memory.role,
            Game.spawns['MaxSpawn'].pos.x + 1,
            Game.spawns['MaxSpawn'].pos.y,
            {align: 'left', opacity: 0.8});
    }

    for(var name in Game.creeps) {
        var creep = Game.creeps[name];
        if(creep.memory.role == 'harvester') {
            roleHarvester.run(creep);
        }
        if(creep.memory.role == 'builder') {
            roleBuilder.run(creep);
        }
        if(creep.memory.role == 'upgrader') {
            roleUpgrader.run(creep);
        }
    }

    Object.defineProperty(Source.prototype, 'memory', {
        get: function() {
            if(_.isUndefined(this.room.memory.sources)) {
                this.room.memory.sources = {};
            }
            if(!_.isObject(this.room.memory.sources)) {
                return undefined;
            }
            return this.room.memory.sources[this.id] = this.room.memory.sources[this.id] || {};
        },
        set: function(value) {
            if(_.isUndefined(this.room.memory.sources)) {
                Memory.sources = {};
            }
            if(!_.isObject(this.room.memory.sources)) {
                throw new Error('Could not set source memory');
            }
            this.room.memory.sources[this.id] = value;
        }
    });
}

