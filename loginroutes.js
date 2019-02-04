
// exports.login=function(req,res){
//     var username=req.body.username;
//     var password=req.body.password;

//     connection.query('SELECT * FROM login WHERE username = ?',[username], function (error, results, fields) {
//       if (error) {
//           res.json({
//             status:mix,
//             message:'there are some error with query'
//             })
//       }else{
//         if(results.length >0){
//             if(password==results[0].password){
//                 res.json({
//                     status:true,
//                     message:'successfully authenticated'
//                 })
//             }else{
//                 res.json({
//                   status:false,
//                   message:"username and password does not match"
//                  });
//             }
         
//         }
//         else{
//           res.json({
//               status:false,    
//             message:"username does not exits"
//           });
//         }
//       }
//     });
// }