pipeline {
  agent any
  stages {
    stage('Deploy') {
      steps {
        dir('/home/ec2-user/folio_cloud') {
          sh 'git pull && DOCKER_BUILDKIT=0 docker compose up -d --build'
        }
      }
    }
  }
}