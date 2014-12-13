/**
 * Created by Johannes on 02.12.2014.
 */

var uniqueItemId = 0;

var Leaf = function(name, size){
    this.name = name;
    this.size = size;
    this.key = uniqueItemId++;
};

var Tree = function(name){
    this.__children = [];
    this.removedSmallChildren = [];
    this.leaves = [];
    this.dict = {};
    this.name = name;
    this.size = 0;
    this.key = uniqueItemId++;
};

Tree.prototype.addNode = function(name){
    var node = new Tree(name);
    this.__children.push(node);
    this.dict[name] = node;

    return node;
};

Tree.prototype.addChild = function(name, size){
    var leaf = new Leaf(name, size);
    this.__children.push(leaf);
    this.leaves.push(leaf);
};

Tree.prototype.removeChild = function(name){
    var child;
    this.__children.forEach(function(c){
        if(c.name == name){
            child = c;
        }
    });

    if(child){
        this.__children.splice(this.__children.indexOf(child), 1);
        this.leaves.splice(this.leaves.indexOf(child), 1);
    }
};

Tree.prototype.getXLargestChildrenSize = function(childIndex){
    var sizes = this.leaves.map(function(leaf){
        return leaf.size;
    });

    var compf = function(a, b){
        return a == b ? 0:
            a > b ? -1 : 1
    };
    sizes = sizes.sort(compf);

    return sizes.length > childIndex ? sizes[childIndex] : 0;
};

Tree.prototype.getNode = function(name){
    return this.dict[name];
};

Tree.prototype.computeSize = function(){

    var size = 0;
    this.__children.forEach(function(child){
        if(child instanceof Leaf){
            size += child.size;
        } else {
            size += child.computeSize();
        }
    });

    this.size = size;
    return size;
};


Tree.prototype.publishChildren = function() {
    this.children = this.__children;
    this.__children.forEach(function (child) {
        if (!(child instanceof Leaf)) {
            child.publishChildren();
        }
    });
};

Tree.prototype.pruneSmallFiles = function(numChildren){
    this.__children.forEach(function(child){
        if(!(child instanceof Leaf)){
            child.pruneSmallFiles(numChildren);
        }
    });

    // add children that might have been deleted during previous runs
    Array.prototype.push.apply(this.__children, this.removedSmallChildren);
    Array.prototype.push.apply(this.leaves, this.removedSmallChildren);

    this.removedSmallChildren.length = 0; //clear array

    var threshold = this.getXLargestChildrenSize(numChildren),
        counter = 0,
        totalSize = 0;

    for(var i=0; i<this.leaves.length; i++) {
        var item = this.leaves[i];
        if (item.size <= threshold) {
            counter++;
            totalSize += item.size;

            this.__children.splice(this.__children.indexOf(item), 1);
            this.leaves.splice(i, 1);

            this.removedSmallChildren.push(item);
            i--;
        }
    }

    if(counter){
        this.addChild(counter+" small files", totalSize);
    }
};