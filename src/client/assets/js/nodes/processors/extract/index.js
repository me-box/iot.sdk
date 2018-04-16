import Node from "./node";

const matches = (path, ptype)=>{
    return ptype;
}

//TODO: ptype must alos have the opriginal node id embeedded in it.  so ptype = {id:nid, types:[]}  rather than []
//this will then make it possible to  figure out where a data item orginated from AND make it possible to tag according to src node for
//attributes labelled the same in extract!

const _existsinupstream = (upstream={}, sid)=>{
   

    if (upstream[sid]){
        return true;
    }else{
        return Object.keys(upstream).reduce((acc,key)=>{
            return acc || upstream[key].map(i=>i.id).indexOf(sid) !== -1;
        },false);
    }
}

const _matches =(nid, filters, key, schema)=>{
    console.log("performing a match with filters", filters, "and key", key, ",schema", schema);

    //const paths = filters.filter(i=>i.nid==key || i.sid==key).map(i=>i.path.join("."));
    const paths = filters.map(i=>`${i.sid}.${i.path.join(".")}`);
    console.log("PATHS are", paths);
    console.log("schame is", schema);
    //console.log('key is', key);

    const matches = schema.filter((item)=>{

        console.log("item required is", item.required);
        
        if (!item.required){ 
            return false;
        }

        //shorthand version of allOf is an array with each item that needs to match
        if (Array.isArray(item.required)){
            
            if (item.required.length <= 0)
                return false;
            console.log("doing match search against required:", item)
            return item.required.reduce((acc, r)=>{
                console.log(`looking for ${key}.${r}`);
                return acc && paths.indexOf(`${key}.${r}`) !== -1;
            },true);
        }

        if (item.required === Object(item.required)){
            //do anyOf, allOf, not check
            return true;
        }
         
    },{}).map((i)=>{
        return {    ...i,
            required: i.required.map(i=>`payload.${key}.${i}`)
        }
    });

    if (matches.length> 0){
        console.log("** MATCHES", {[nid]:matches});
    }

    return (matches.length > 0) ?  matches : []
}

const config = {
    category: 'processors',    
    color: '#3771C8',
    
    defaults: {             
        
        name: {value:""},
        
        filters: {  
            value:[]
        },
        previousinputs: {value: []}
    },

    schemakey: ["filters"],
    
    inputs:1,               
    
    outputs:1,             
   
    icon: "fa-code-fork",    
    unicode: '\uf126',    
    label: function() {     
        return this.name||this.topic||"extract";
    },
    
    description: ()=> "a node for extracting object attributes",
    
    labelStyle: function() { 
        return this.name?"node_label_italic":"";
    },

    schemafn:(filters=[], node={}, inputs=[])=>{

       // let paths = {};

        const nid = node.id || "";

        const ptypes = inputs.reduce((acc,input)=>{    
            if (input.schema && input.schema.output && input.schema.output.ptype){

              acc[nid] = [
                    ...(acc[nid] || []),  
                    ...Object.keys(input.schema.output.ptype).reduce((acc,key)=>{
                        return [...acc,  ..._matches(nid,filters,key,input.schema.output.ptype[key])]
                    },[])
              ]
            }
            return acc;
        },{});
        
       

        //console.log("node:", nid, "schema fn, ptypes are,", ptypes, " filters are", filters);

        const items = filters.reduce((acc, filter)=>{
            
            const {sid, item:{type, name, description}, path} = filter;
           
           // paths[sid]  = [...(paths[sid] || []), path.join(".")];
            

            return [...acc, {
                type : "object",
                description: "container object",
                id: sid,
                properties : {
                    [`${sid}.${path.join(".")}`] : {
                        type: type,
                        description: description,
                    }
                }
            }]
        },[]);


       /* const _ptypes = Object.keys(ptypes).reduce((acc,sid)=>{

            //if (!_existsinupstream(upstream, sid)){ //remove if ptype is no longer upstream
            //    return acc;
            //}

            const item = ptypes[sid] || [];
            const _paths = paths[sid] || [];
            return [...acc, ...item.reduce((acc, pt)=>{
                const eligible = (pt.required || []).reduce((acc, value)=>{
                    return acc && _paths.indexOf(value) !== -1;
                }, true);

                if (eligible){
                    return [...acc, pt]
                }
                return acc;
            },[])]
        },[]);  */ 

       

        console.log("extract OUTPUT schema is");
        console.log({
                type: "object",
                description: "container object",
                properties: {
                    name: {type:'string', description: "a name assigned to this node"}, 
                    id:  {type:'string', description: "the node id: [id]"},
                    payload : {
                        type:"array", 
                        description:"extracted attributes", 
                        items: items,
                    }
                },
                ptype: ptypes
            });


        return {
            input:{
                type: "any",
                description: "extract will take ANY object as input"
            },
            output: {
                type: "object",
                description: "container object",
                properties: {
                    name: {type:'string', description: "a name assigned to this node"}, 
                    id:  {type:'string', description: "the node id: [id]"},
                    payload : {
                        type:"array", 
                        description:"extracted attributes", 
                        items: items,
                    }
                },
                ptype: ptypes
            }
        }
    },

    risk: (subtype="")=>{
      return {
          score: 0,
          reason: "no risk in extracting data from an object"
      }        
    },

    descriptionfn: (filters)=>{
        return `<p>This node will take an incoming message and then pull out specific values from it adn places them in the payload of the output message.</p>
                <p>It is a simple way of removing all data from a message that is of no use further down the flow </p>`;
    }
    
}

export default {
    type:     "extract",
    def:      Object.assign({_: (id)=>{return id}}, config, {nodetype:"extract"}),
    node:     Node,
}