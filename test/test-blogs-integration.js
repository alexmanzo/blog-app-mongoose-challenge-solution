const chai = require('chai')
const chaiHttp = require('chai-http')
const faker = require('faker')
const mongoose = require('mongoose')

const expect = chai.expect

const {BlogPost} = require('../models')
const {app, runServer, closeServer} = require('../server')
const {TEST_DATABASE_URL} = require('../config')

chai.use(chaiHttp)

function seedBlogPostData () {
	console.info('seeding restaurant data')
	const seedData = []

	for (let i=1; i<=10; i++) {
		seedData.push(genererateBlogPostData())
	}

	return BlogPost.insertMany(seedData)
}

function genererateBlogPostData() {
	return {
    	author: faker.name.findName(),
    	content: faker.lorem.paragraph(),
    	title: faker.lorem.slug(),
    	created: faker.date.past()
	}
}

function tearDownDb() {
	console.warn('Deleting database')
	return mongoose.connection.dropDatabase()
}

describe('Blog API resource', function(){
	before(function(){
		return runServer(TEST_DATABASE_URL)
	})

	beforeEach(function(){
		return seedBlogPostData()
	})

	afterEach(function() {
		return tearDownDb()
	})

	after(function() {
		return closeServer()
	})

	describe('GET endpoint', function(){

		it('should return all existing blog posts', function(){
			let res;
			return chai.request(app)
				.get('/posts')
				.then(function(_res){
					res = _res
					expect(res).to.have.status(200)
					expect(res.body).to.have.length.of.at.least(1)
					return BlogPost.count()
				})
		})

		it('should return blog posts with the right fields', function(){
			let resBlogPost;
			return chai.request(app)
				.get('/posts')
				.then(function(res) {
					expect(res).to.have.status(200)
					expect(res).to.be.json
					expect(res.body).to.be.a('array')
					expect(res.body).to.have.length.of.at.least(1)

					res.body.forEach(function(post) {
						expect(post).to.be.a('object')
						expect(post).to.include.keys('id', 'title', 'content', 'created')
					})

					resBlogPost = res.body[0]
					return BlogPost.findById(resBlogPost.id)
				})
				.then (function(post){
					expect(resBlogPost.id).to.equal(post.id)
					expect(resBlogPost.title).to.equal(post.title)
					expect(resBlogPost.content).to.equal(post.content)
				})
		})
	})

	describe('POST endpoint', function() {
		it('should add a new blog post', function(){

			const newPost = genererateBlogPostData()

			return chai.request(app)
				.post('/posts')
				.send(newPost)
				.then(function(res){
					expect(res).to.have.status(201)
					expect(res).to.be.json
					expect(res.body).to.be.a('object')
					expect(res.body).to.include.keys('id', 'title', 'content', 'author', 'created')
					expect(res.body.id).to.not.be.null
					expect(res.body.title).to.equal(newPost.title)
					expect(res.body.content).to.equal(newPost.content)
					expect(res.body.author).to.equal(newPost.author)
				})
		})
	})

	describe('PUT endpoint', function(){
		it('should update field you send over', function() {
			const updateData = {
				author: 'michelle manzo',
				title: 'this is a title'
			}

			return BlogPost
				.findOne()
				.then(function(post) {
					updateData.id = post.id

					return chai.request(app)
						.put(`/posts/${post.id}`)
						.send(updateData)
				})
				.then(function(res) {
					expect(res).to.have.status(204)

					return BlogPost.findById(updateData.id)
				})
				.then(function(post) {
					expect(post.author).to.equal(updateData.author)
					expect(post.title).to.equal(updateData.title)
				})
		})
	})

	describe('DELETE endpoint', function() {

		let post;

		return BlogPost
			.findOne()
			.then(function(_post) {
				post = _post
				return chai.request(app).delete(`/posts/${post.id}`)
			})
			.then(function(res) {
				expect(res).to.have.status(204)
				return BlogPost.findById(post.id)
			})
			.then(function(_post) {
				expect(_post).to.be.null
			})
	})
})




