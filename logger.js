// var express = require('express');
// var router = express.Router();
// const fs = require('fs');
// const ejs = require('ejs');
// const pdf = require('html-pdf');
// var connection = require('./db.connection');

// router.get("/pdf/:id",function(req,res){
//     const query = 'select * from advt_publish_log where advt_id=?';
//     connection.query(query,[req.params.id],function(err,rows){
//         if(err || !rows[0]){
//             res.send({
//                 error:true,
//                 message:'No Report Found'
//             });
//             return;
//         }
//         sendReport(rows,function(err,fileName){
//             if(err){
//                 res.send(err);
//                 return;
//             }
//             res.send({fileName});
//         });        
//     });
// })

//  function sendReport(users,callback){
//     info = {

//     };
//     info.advt_id = users[0].advt_id;
//     info.client_user_name = users[0].client_user_name;
//     info.admin_user_name = users[0].admin_user_name;
//     info.subject = users[0].subject;
//     info.message = users[0].message;
//     users = users.map(user=>{
//         return {
//             'Email Address':user.person_email_address,
//             'Phone Number':user.phone_number,
//             'Status':user.status,
//             'Type':user.type
//         };
//     });

//     var html = ejs.render(`
//     <html>
//         <head>
//         <style>
//         *{
            
//             font-size:15px;
//         }
//         body{
//             background-color:#e5f8fb;
//         }
//         table {
//             font-family: arial, sans-serif;
//             border-collapse: collapse;
//             width: 100%;
//           }
          
//           td, th {
//             border: 1px solid #dddddd;
//             text-align: left;
//             padding: 8px;
//           }
          
//           tr:nth-child(even) {
//             background-color: #dddddd;
//           }
//         </style>
//         </head>
//         <body>
//         <table>
//         <tr>
//          <% Object.keys(users[0]).forEach(function(label){ %>
//             <th>
//                 <%- label %>    
//             </th>
//         <%}); %>
//         </tr>
//       <% users.forEach(function(user){ %>
//         <tr>
//         <% Object.keys(user).forEach(function(label){ %>
//             <td>
//                 <%- user[label] %>
//             </td>
//         <%}); %>
//         </tr>
//       <% }); %>
    
//     </table>
//         </body>
//     </html>
   
    
//     `,{users});
 
//     let d = new Date();
//     // fs.writeFileSync('./public/pdf/report_'+info.advt_id +'.html',html);
//     //     callback(null,'/public/pdf/report_'+info.advt_id +'.html');

//     // return;
//     pdf.create(html,{
//         "border": {
//             "top": "0",            // default is 0, units: mm, cm, in, px
//             "right": ".5in",
//             "bottom": "0",
//             "left": ".5in"
//           },"header": {
//             "height": "80mm",
//             "contents": `<div style="position:relative;"><div style="text-align: center;margin-bottom:25px;">Advertisement Publish Logs
//            </div>
//            <span style="position:absolute;right:0px;top:15px;">Generated On:  ${d.toLocaleDateString()}</span>            
//                 <table>
//                     <tr>
//                         <th>Advertisement  Id</th>
//                         <th>Client User Name</th>
//                         <th>Admin User Name</th>                       
//                     </tr>
//                     <tr>
//                         <td>${info.advt_id}</td>
//                         <td>${info.client_user_name}</td>
//                         <td>${info.admin_user_name}</td>                      
//                     </tr>
//                 </table>
//                 <table>
//                 <tr>                   
//                     <th>Subject</th>
//                     <th>Message</th>
//                 </tr>
//                 <tr>                   
//                     <td>${info.subject}</td>
//                     <td>${info.message}</td>
//                 </tr>
//             </table>
//             </div>`
//           },
//           "zoomFactor": "0.7"   
//     }).toFile('./public/pdf/report_'+info.advt_id +'.pdf',function(err, res){
//         if(err){
//             callback({error:true,err:err});
//             return;
//         }
//       callback(null,'/public/pdf/report_' + info.advt_id +'.pdf');
//     });   
// }

// module.exports = router;