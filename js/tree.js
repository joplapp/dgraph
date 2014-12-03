/**
 * Created by Johannes on 02.12.2014.
 */

var Leaf = function(name, size){
    this.name = name;
    this.size = size;
};



var Tree = function(name){
    this.children = [];
    this.name = name;
};

Tree.prototype.addNode = function(name){
    var node = new Tree(name);
    this.children.push(node);

    return node;
};

Tree.prototype.addChild = function(name, size){
    this.children.push(new Leaf(name, size))
};

Tree.prototype.toArray = function(){
    var result = {
        name: this.name,
        children: []
    };

    this.children.forEach(function(child){
        if(child instanceof Leaf){
            result.children.push({
                name: child.name,
                size: child.size
            })
        } else {
            result.children.push(child.toArray())
        }
    });

    return result;
};