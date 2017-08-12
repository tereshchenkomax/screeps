
var roleHarvester = {
    run: function(creep){
        if (creep.carryCapacity > creep.carry.energy) {
            var sources = creep.room.find(FIND_SOURCES);
            var loc = [];

            for(i = 0; i <= sources.length-1; i++){
                if(sources[i].energy >= (sources[i].energyCapacity * 0.65)){
                    loc.push(sources[i]);
                }
            }

            if (creep.harvest(loc[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(loc[0]);
            }
        } else {
            var sources = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType == STRUCTURE_EXTENSION ||
                        structure.structureType == STRUCTURE_SPAWN ||
                        structure.structureType == STRUCTURE_STORAGE ||
                        structure.structureType == STRUCTURE_CONTAINER ||
                        structure.structureType == STRUCTURE_TOWER) && structure.energy < structure.energyCapacity;
                }
            });

            for (let s of sources) {
                if (creep.carry.energy !== 0) {
                    if (creep.transfer(s, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE && s.energy < s.energyCapacity) {
                        creep.moveTo(s);
                    }
                }
            }
        }
    }
};

module.exports = roleHarvester;
