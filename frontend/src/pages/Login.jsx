import Form from "../components/Form"

function Login(){
    return <Form route="/api/auth/login/" method="login"></Form>
}

export default Login