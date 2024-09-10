$(function(){

	var body = $('body'),
		stage = $('#stage'),
		back = $('a.back')

	// Step 1
	$('#step1 .encrypt').click(function(){
		body.attr('class', 'encrypt')
		step(2)
	})

	$('#step1 .decrypt').click(function(){
		body.attr('class', 'decrypt')
		step(2)
	})


	//Step 2

	$('#step2 .button').click(function(){
		// file browser dialog
		$(this).parent().find('input').click()
	})


	// Set up events for the file inputs

	var file = null

	$('#step2').on('change', '#encrypt-input', function(e){

		// Has a file been selected?

		if(e.target.files.length!=1){
			alert('Please select a file to encrypt!')
			return false
		}

		file = e.target.files[0]

		if(file.size > 50240*1024){
			alert('Please choose files smaller than 50MB, otherwise you may crash your browser. \nThis is a known issue. ')
			return
		}

		step(3)
	})

	$('#step2').on('change', '#decrypt-input', function(e){

		if(e.target.files.length!=1){
			alert('Please select a file to decrypt!')
			return false
		}

		file = e.target.files[0]
		step(3)
	})


	function merge(...bufferviews) {
		let len = 0
		for (let i = 0; i < bufferviews.length; i++)
			len += bufferviews[i].byteLength
		let result = new Uint8Array(len)
		let pointer = 0
		for (let i = 0; i < bufferviews.length; i++) {
			result.set(new Uint8Array(bufferviews[i].buffer, bufferviews[i].byteOffset, bufferviews[i].byteLength), pointer)
			pointer += bufferviews[i].byteLength
		}
		return result
	}

	function typedArrayToURL(typedArray, mimeType) {
		return URL.createObjectURL(new Blob([typedArray.buffer], {type: mimeType}))
	}

	// Step 3


	$('a.button.process').click(function(){

		var input = $(this).parent().find('input[type=password]'),
			a = $('#step4 a.download'),
			password = input.val()

		input.val('')

		if(password.length<5){
			alert('Please choose a longer password!')
			return
		}

		var reader = new FileReader()

		if(body.hasClass('encrypt')){

			reader.onload = function(e){

				let data = new Uint8Array(reader.result)

				let salt = new Uluru.Random().fill(new Uint8Array(8))

				let key = new Uluru.Pbkdf().compute(password, salt).result

				// Log the size of the file 
				console.log(`Encrypting ${(data.length / 1000).toFixed(2)} kB`)
				console.time("encryption")

				let encryptor = new Uluru.ChaCha20(key)

				encryptor.update(new Uint8Array(reader.result))

				let encrypted = encryptor.finalize()

				console.timeEnd("encryption")

				let result = merge(salt, encrypted.data, encrypted.mac)

				// The download attribute will cause the contents of the href
				// attribute to be downloaded when clicked. The download attribute
				// also holds the name of the file that is offered for download.

				a.attr('href', typedArrayToURL(result))

				var newname = file.name.split(".")
				newname.splice(-1, 0, "encrypted")
				a.attr('download', newname.join("."))

				step(4)
			}

			// This will encode the contents of the file into a data-uri.
			// It will trigger the onload handler above, with the result

			reader.readAsArrayBuffer(file)
		}
		else {

			reader.onload = function(e){

				let data = new Uint8Array(reader.result)

				let salt = data.slice(0, 8)

				let key = new Uluru.Pbkdf().compute(password, salt).result

				// Log the size of the file 
				console.log(`Decrypting ${(data.length / 1000).toFixed(2)} kB`)

				console.time("decryption")

				let decryptor = new Uluru.ChaCha20(key)

				decryptor.update(new Uint8Array(data.buffer, 8, data.length - 8 - 16))

				let decrypted = decryptor.finalize()

				console.timeEnd("decryption")

				let mac = data.slice(-16)

				if(!decryptor.verify(mac))
					return alert("Invalid authentication code")

				//download

				a.attr('href', typedArrayToURL(decrypted.data.slice()))
				a.attr('download', file.name.replace('.encrypted','.decrypted'))

				step(4)
			}

			reader.readAsArrayBuffer(file)
		}
	})


	/* The back button */


	back.click(function(){

		// Reinitialize the hidden file inputs,
		// so that they don't hold the selection 
		// from last time

		$('#step2 input[type=file]').replaceWith(function(){
			return $(this).clone()
		})

		step(1)
	})


	// Helper function that moves the viewport to the correct step div

	function step(i){

		if(i == 1){
			back.fadeOut()
		}
		else{
			back.fadeIn()
		}

		// Move the #stage div. Changing the top property will trigger
		// a css transition on the element. i-1 because we want the
		// steps to start from 1:

		stage.css('top',(-(i-1)*100)+'%')
	}

})
