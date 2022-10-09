import PersistenceStore from './Persistence'

describe('Persistence', () => {
  let persistence: PersistenceStore

  beforeEach(() => {
    persistence = new PersistenceStore()
  })

  describe('commit', () => {
    it('success', () => {
      persistence.commit()
    })
  })
})
