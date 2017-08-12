/**
 * Created by jesus on 29.07.2017.
 */
var towers = Game.rooms['E83S75'].find(FIND_STRUCTURES,{ filter: (s) => s.structureType == STRUCTURE_TOWER});

for (let tower of towers) {
    targets = Game.rooms['E83S75'].find(FIND_HOSTILE_CREEPS);
    if(targets.length > 0){
        for (let target of targets) {
            tower.attack(target);
        }
    }
}
