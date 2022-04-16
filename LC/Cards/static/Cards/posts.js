document.addEventListener('DOMContentLoaded', function() {

  document.querySelector('#posts_next').addEventListener('click', () => load_nextpage(+1));
  document.querySelector('#posts_prev').addEventListener('click', () => load_nextpage(-1));
  
  // By default, load the inbox
  load_posts(1);
});

function load_nextpage(num) {

   const poststable = document.querySelector('#posts');
   page_number = poststable.getAttribute("page_number_data")
   load_posts(parseInt(page_number)+num)

}
function likebuttonclick(button) {
  post_id_data = button.getAttribute("post_id_data")
  console.log(post_id_data)
  fetch('/like', {
     method: 'POST',
     body: JSON.stringify({
     PostId: parseInt(post_id_data)
     })
   }
   )
   .then(response => response.json())
   .then(result => {
    const likebutton = document.querySelector('#likebutton'+post_id_data);
    likes_count = result.likes_count;
    likebutton.innerHTML = `(${likes_count})like`;
     if (result.isLiked) {
       likebutton.innerHTML = `(${likes_count})unlike`   
       }
   })
}

function editbuttonclick(button) {
  post_id_data = button.getAttribute("post_id_data")
  const posttext=   document.querySelector('#posttext'+post_id_data);
  if (button.innerHTML=='save') {
    document.querySelector('#editbutton'+post_id_data).innerHTML = 'edit';
    posttext.style.display = 'block'
    let textedit = document.querySelector('#postedit'+post_id_data);
    posttext.parentElement.removeChild(textedit);
    posttext.innerHTML = textedit.value;
    fetch('/editpost', {
      method: 'POST',
      body: JSON.stringify({
        id: parseInt(post_id_data),
        description: textedit.value
      })
    }
    )
  } else {
    posttext.style.display = 'none';
    document.querySelector('#editbutton'+post_id_data).innerHTML = 'save';
    let textedit = document.createElement('textarea');
    textedit.setAttribute('post_id_data',post_id_data);
    textedit.setAttribute('id',"postedit"+post_id_data);
    textedit.innerHTML = posttext.innerHTML;
    posttext.parentElement.insertBefore(textedit,posttext);
    }

}

function load_posts(pagenumber) {
  new URL(document.location).pathname=="/following"
  following = new URL(document.location).pathname=="/following";
  fetch('/getposts', {
    method: 'POST',
    body: JSON.stringify({
      pagenumber: pagenumber,
      following: following
    })
  }
  )
  .then(response => response.json())
  .then(postdata => {
    console.log(postdata)
    const poststable = document.querySelector('#posts');
    poststable.innerHTML='';
    poststable.setAttribute('page_number_data',pagenumber);
    const nextbutton =  document.querySelector('#posts_next');
    if (postdata.isnextpage) { nextbutton.style.display = 'inline' }
        else {nextbutton.style.display = 'none'};

    const prevbutton =  document.querySelector('#posts_prev');
        if (pagenumber>1) { prevbutton.style.display = 'inline' }
            else {prevbutton.style.display = 'none'};
    const user_id = parseInt(poststable.getAttribute('userId_data'))
         
    postdata.posts.forEach(element => {
      var post = document.createElement('tr')
      post.setAttribute('style',`border: 1px solid; ${element.read ? 'background-color:lightgray':''}`);
      editbutton = "";
      if (element.author.id == user_id) {
        editbutton = `<button onclick='editbuttonclick(this)' id='editbutton${element.id}' post_id_data =${element.id}> edit</button>`
      }
      likeaction="like";
      if (element.liked) {
        likeaction='unlike'
      }
      likebutton = `<button onclick='likebuttonclick(this)' id='likebutton${element.id}' post_id_data =${element.id}> (${element.likes_count})${likeaction}</button>`
      post.innerHTML =`<td> <a href='users?id=${element.author.id}'>${element.author.name}<a> </td> 
                       <td id = 'postdata${element.id}'> <div id = 'posttext${element.id}'> ${element.description} </div> ${editbutton}  </td> 
                       <td> ${likebutton} </td>
                       <td> ${element.timestamp} </td>`;
      poststable.appendChild(post)
                                   });
                   })
}

