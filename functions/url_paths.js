let db_url = ''
let url = ''
if (process.env.NODE_ENV == 'production') {
  db_url = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_URL}/MyHomepage?retryWrites=true&w=majority`
  url = 'https://tobiashoelzer.dynu.net'
}else{
  db_url = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_URL}/test?retryWrites=true&w=majority`
  url = 'localhost:3000'
}

module.exports = {
  main: {
    route: '/',
    blog: '/blog',
    lang: '/lang',
    aboutme: '/aboutme',
    work: '/mywork',
    works: '/works',
    references: '/contact'
  },
  adress: {
    local: 'localhost:3000',
    url: url,
    db: db_url
  },
  blog: {
    route: '/',
    login: '/login',
    logout: '/logout',
    register: '/register',
    delprofile: '/delprofile',
    profile: '/profile',
    write: '/write',
    articles: '/articles',
    delarticle: '/delarticle',
    authors: '/authors',
    pictures: '/picture'
  },
  myshit: {
    route: '/',
    passwordgen: '/passwordgen',
    feelings: '/feelings',
    playground: '/playground'
  }
}
