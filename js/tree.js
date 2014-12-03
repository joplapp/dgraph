/**
 * Created by Johannes on 02.12.2014.
 */

var Leaf = function(name, size){
    this.name = name;
    this.size = size;
};



var Tree = function(name){
    this.children = [];
    this.leaves = [];
    this.nodes = [];
    this.dict = {};
    this.name = name;
    this.size = 0;
};

Tree.prototype.addNode = function(name){
    var node = new Tree(name);
    this.children.push(node);
    this.nodes.push(node);
    this.dict[name] = node;

    return node;
};

Tree.prototype.addChild = function(name, size){
    var leaf = new Leaf(name, size);
    this.children.push(leaf);
    this.leaves.push(leaf);
};


Tree.prototype.getXLargestChildrenSize = function(childIndex){
    var sizes = this.leaves.map(function(leaf){
        return leaf.size;
    });

    sizes = sizes.sort();

    return sizes[sizes.length-childIndex] ? sizes[sizes.length-childIndex] : 0;
};

Tree.prototype.combineLeaves = function(threshold){
    var counter = 0;
    var totalSize = 0;

    for(var i=0; i<this.leaves.length; i++) {
        var item = this.leaves[i];
        if (item.size <= 1000) {
            counter++;
            totalSize += item.size;

            this.children.splice(this.children.indexOf(item), 1);
            this.leaves.splice(i, 1);
            i--;
        }
    }

    if(counter){
        this.addChild(counter+" more files", totalSize);
    }
};

Tree.prototype.getNode = function(name){
    return this.dict[name];
};

Tree.prototype.toArray = function(){
    var result = {
        name: this.name,
        children: [],
        size: 0
    };

    this.children.forEach(function(child){
        if(child instanceof Leaf){
            result.children.push({
                name: child.name,
                size: child.size
            });
            result.size += child.size;
        } else {
            var childResult = child.toArray();
            result.children.push(childResult);
            result.size += childResult.size;
        }
    });

    return result;
};