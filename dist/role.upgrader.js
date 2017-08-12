var roleUpgrader = {

    /** @param {Creep} creep **/
    run: function(creep) {
        if(creep.memory.updating && creep.carry.energy == 0) {
            creep.memory.updating = false;
            creep.say('🔄 harvest');
        }
        if(!creep.memory.updating && creep.carry.energy == creep.carryCapacity) {
            creep.memory.updating = true;
            creep.say('upgrade');
        }
        if(!creep.memory.updating) {
            var sources = creep.room.find(FIND_SOURCES);
            if(creep.harvest(sources[0]) == ERR_NOT_IN_RANGE) {
                creep.moveTo(sources[0], {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        }
        else {
            if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        }
    }
};

module.exports = roleUpgrader;
